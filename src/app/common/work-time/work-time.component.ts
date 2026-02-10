import { Router } from "@angular/router";
import { Component, OnInit, OnDestroy } from "@angular/core";
import { AuthService } from "../../pages/services/auth.service";
import { BranchService } from "../../pages/services/branch.service";
import { Subscription } from "rxjs";
import { UserStateService } from "../../store/user-state.service";

interface BreakPeriod {
  start: number;
  end?: number;
  duration?: number;
}

interface WorkSession {
  clockIn: number;
  clockOut?: number;
  breaks: BreakPeriod[];
  locale: string;
  timezone: string;
  totalWorked?: number;
}

interface UserEvent {
  eventType: string;
  createdAt: string;
  updatedAt?: string;
  processed?: boolean;
  event_id?: string;
  eventData?: string;
  userId?: string;
}

@Component({
  selector: "app-work-time",
  templateUrl: "./work-time.component.html",
  styleUrls: ["./work-time.component.css"],
})
export class WorkTimeComponent implements OnInit, OnDestroy {
  sessions: WorkSession[] = [];
  activeSession?: WorkSession;
  elapsedTime = "00:00:00";
  intervalId?: any;

  breakTime = "00:00:00";
  breakIntervalId?: any;

  events: UserEvent[] = [];
  logoutPendingEvent: UserEvent | null = null;

  pendingIntervalId?: any;
  pendingRemaining = "00:00:00";

  showDropdown = false;

  readonly DEFAULT_PENDING_SECONDS = 70;
  readonly SESSIONS_KEY = "work_time_sessions_v1";
  readonly EVENTS_KEY = "work_time_events_v1";

  private subUser?: Subscription;
  private subEvents?: Subscription;
  branchId: any;
  userId: any;
  userRole: any;

  constructor(
    private authService: AuthService,
    private BranchService: BranchService,
    private router: Router,
    private userStateService: UserStateService
  ) {}

  ngOnInit(): void {
    this.loadSessions();
    this.loadEvents();

    if (this.activeSession && !this.activeSession.clockOut) {
      this.startStopwatch();
    }

    const s = this.userStateService.getUserId();
    this.userId = s;
    this.userRole = this.userStateService.getRole();
    this.subEvents = this.BranchService.getLogoutStatus(this.userId).subscribe(
      (incoming: any) => {
        const arr = Array.isArray(incoming) ? incoming : [incoming];
        arr.forEach((ev: any) => this.processEvent(ev));
      }
    );
  }

  ngOnDestroy(): void {
    this.stopTimers();
    this.stopBreakTimer();
    this.stopPendingTimer();
    if (this.subUser) this.subUser.unsubscribe();
    if (this.subEvents) this.subEvents.unsubscribe();
  }

  // ---------- role helper ----------
  get isUserRole(): boolean {
    return !!this.userRole && String(this.userRole).toUpperCase() === "BRANCH" || String(this.userRole).toUpperCase() === "HEAD";
  }

  // ---------- storage helpers ----------
  loadSessions(): void {
    const data = localStorage.getItem(this.SESSIONS_KEY);
    if (data) {
      try {
        this.sessions = JSON.parse(data) as WorkSession[];
        const active = this.sessions.find((s) => !s.clockOut);
        if (active) this.activeSession = active;
      } catch {
        this.sessions = [];
      }
    }
  }

  saveSessions(): void {
    localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(this.sessions));
  }

  loadEvents(): void {
    const data = localStorage.getItem(this.EVENTS_KEY);
    if (data) {
      try {
        this.events = JSON.parse(data) as UserEvent[];
        const pending = this.events.find(
          (e) => e.eventType === "LOGOUT_PENDING" && !e.processed
        );
        if (pending) {
          this.logoutPendingEvent = pending;
          // Only show/start pending timer if user role is USER
          if (this.isUserRole) this.startPendingTimer(pending);
        }
      } catch {
        this.events = [];
      }
    }
  }

  saveEvents(): void {
    localStorage.setItem(this.EVENTS_KEY, JSON.stringify(this.events));
  }

  clearAll(): void {
    localStorage.removeItem(this.SESSIONS_KEY);
    localStorage.removeItem(this.EVENTS_KEY);
    this.sessions = [];
    this.events = [];
    this.activeSession = undefined;
    this.logoutPendingEvent = null;
    this.stopTimers();
    this.stopPendingTimer();
    this.elapsedTime = "00:00:00";
    this.pendingRemaining = "00:00:00";
  }

  // ---------- event processing ----------
  processEvent(raw: any): void {
    if (!raw || !raw.eventType) return;

    const ev: UserEvent = {
      eventType: raw.eventType,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      processed: raw.processed,
      event_id: raw.event_id || raw.eventId || `evt-${Date.now()}`,
      eventData: raw.eventData,
      userId: raw.userId,
    };

    const idx = this.events.findIndex((e) => e.event_id === ev.event_id);
    if (idx >= 0) this.events[idx] = ev;
    else this.events.push(ev);
    this.saveEvents();

    if (ev.eventType === "LOGIN") {
      const storedLogin = this.events
        .filter((e) => e.eventType === "LOGIN")
        .slice(-2)[0];
      if (storedLogin && storedLogin.createdAt !== ev.createdAt) {
        this.clearAll();
        this.events = [ev];
        this.saveEvents();
        this.startSessionFromEvent(ev);
        return;
      }

      if (!this.activeSession) {
        this.startSessionFromEvent(ev);
      }
    } else if (ev.eventType === "LOGOUT_PENDING") {
      // store the event always, but only start the pending UI for USER role
      this.logoutPendingEvent = ev;
      if (this.isUserRole) {
        this.startPendingTimer(ev);
      } else {
        // For non-USER roles, do not start pending timer or show logout clock UI.
        // Clear local session immediately (server has requested logout).
        this.clearAll();
      }
    }

    if (ev.processed === true || ev.eventType === "LOGOUT_CONFIRMED") {
      this.clearAll();
    }
  }

  startSessionFromEvent(ev: UserEvent): void {
    const createdTs = Date.parse(ev.createdAt);
    const locale = navigator.language || "en-US";
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const session: WorkSession = {
      clockIn: isNaN(createdTs) ? Date.now() : createdTs,
      breaks: [],
      locale,
      timezone,
    };
    this.sessions.push(session);
    this.activeSession = session;
    this.saveSessions();
    this.startStopwatch();
  }

  // ---------- logout / pending behavior ----------
  // Modified: immediate logout for non-USER roles, pending flow for USER role
  clockOutAndStartPending(): void {
    // If role is not USER => immediate logout, no pending timer or logout clock
    if (!this.isUserRole) {
      this.authService.logoutForUserTime();
      if (this.activeSession && !this.activeSession.clockOut) {
        this.activeSession.clockOut = Date.now();
        this.saveSessions();
      }
      this.clearAll();
      this.router.navigateByUrl("/login");
      return;
    }

    // For USER role, preserve existing pending flow
    if (this.logoutPendingEvent) return;

    this.authService.logoutForUserTime();

    const nowIso = new Date().toISOString();
    const updatedIso = new Date(
      Date.now() + this.DEFAULT_PENDING_SECONDS * 1000
    ).toISOString();
    const localPending: UserEvent = {
      eventType: "LOGOUT_PENDING",
      createdAt: nowIso,
      updatedAt: updatedIso,
      processed: false,
      event_id: `local-${Date.now()}`,
    };

    this.events.push(localPending);
    this.saveEvents();
    this.logoutPendingEvent = localPending;
    this.startPendingTimer(localPending);
  }

  startPendingTimer(ev: UserEvent): void {
    this.stopPendingTimer();
    this.logoutPendingEvent = ev;

    const createdTs = Date.parse(ev.createdAt);
    let targetTs = ev.updatedAt
      ? Date.parse(ev.updatedAt)
      : createdTs + this.DEFAULT_PENDING_SECONDS * 1000;
    if (isNaN(targetTs) || targetTs <= createdTs)
      targetTs = createdTs + this.DEFAULT_PENDING_SECONDS * 1000;

    const tick = () => {
      const now = Date.now();
      const remainingMs = targetTs - now;
      if (remainingMs <= 0) {
        this.pendingRemaining = this.formatDuration(0);
        this.stopPendingTimer();
        this.clearAll();
        return;
      }
      this.pendingRemaining = this.formatDuration(remainingMs);
    };

    tick();
    this.pendingIntervalId = setInterval(tick, 1000);
  }

  stopPendingTimer(): void {
    if (this.pendingIntervalId) {
      clearInterval(this.pendingIntervalId);
      this.pendingIntervalId = undefined;
    }
  }

  // ---------- break & stopwatch ----------
  isOnBreak(session?: WorkSession): boolean {
    if (!session) return false;
    const last = this.getLastBreak(session);
    return !!last && !last.end;
  }

  getLastBreak(session?: WorkSession): BreakPeriod | null {
    if (!session || !session.breaks.length) return null;
    return session.breaks[session.breaks.length - 1];
  }

  startBreak(): void {
    if (!this.activeSession) return;
    const last = this.getLastBreak(this.activeSession);
    if (last && !last.end) return;
    this.activeSession.breaks.push({ start: Date.now() });
    this.saveSessions();
    this.pauseStopwatch();
    this.startBreakTimer();
  }

  endBreak(): void {
    if (!this.activeSession) return;
    const currentBreak = this.getLastBreak(this.activeSession);
    if (!currentBreak || currentBreak.end) return;
    currentBreak.end = Date.now();
    currentBreak.duration = currentBreak.end - currentBreak.start;
    this.saveSessions();
    this.stopBreakTimer();
    this.breakTime = this.formatDuration(currentBreak.duration || 0);
    this.startStopwatch();
  }

  startBreakTimer(): void {
    this.stopBreakTimer();
    const currentBreak = this.getLastBreak(this.activeSession);
    if (!currentBreak) return;
    this.breakTime = this.formatDuration(Date.now() - currentBreak.start);
    this.breakIntervalId = setInterval(() => {
      const current = this.getLastBreak(this.activeSession);
      if (!current || current.end) {
        this.stopBreakTimer();
        this.breakTime = "00:00:00";
        return;
      }
      this.breakTime = this.formatDuration(Date.now() - current.start);
    }, 1000);
  }

  stopBreakTimer(): void {
    if (this.breakIntervalId) {
      clearInterval(this.breakIntervalId);
      this.breakIntervalId = undefined;
    }
  }

  startStopwatch(): void {
    this.stopTimers();
    if (this.activeSession) {
      const ms = this.computeElapsed(this.activeSession);
      this.elapsedTime = this.formatDuration(ms);
    } else {
      this.elapsedTime = "00:00:00";
    }
    this.intervalId = setInterval(() => {
      if (!this.activeSession) return;
      const ms = this.computeElapsed(this.activeSession);
      this.elapsedTime = this.formatDuration(ms);
    }, 1000);
  }

  pauseStopwatch(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  stopTimers(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.stopBreakTimer();
  }

  computeElapsed(session: WorkSession): number {
    const now = session.clockOut || Date.now();
    let total = now - session.clockIn;
    for (const b of session.breaks) {
      const bs = b.start;
      const be = b.end || now;
      total -= be - bs;
    }
    return Math.max(0, total);
  }

  formatDuration(ms: number | undefined): string {
    if (ms === undefined || ms === null) ms = 0;
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((totalSeconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  }

  formatTimestamp(
    timestamp: number | undefined,
    locale = "en-US",
    tz = "UTC"
  ): string {
    if (!timestamp) return "-";
    try {
      return new Date(timestamp).toLocaleString(locale, { timeZone: tz });
    } catch {
      return new Date(timestamp).toLocaleString();
    }
  }

  get workBadgeTime(): string {
    return this.elapsedTime;
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }
}
