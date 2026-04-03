import { Router } from "@angular/router";
import { Component, OnInit, OnDestroy } from "@angular/core";
import { AuthService } from "../../pages/services/auth.service";
import { BranchService } from "../../pages/services/branch.service";
import { Subscription } from "rxjs";
import { UserStateService } from "../../store/user-state.service";
import { SnackbarService } from "../snackbar/snackbar.service";

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
  message?: string;
}

interface PendingLogoutState {
  event: UserEvent;
  targetTs: number;
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
  readonly PENDING_LOGOUT_KEY = "work_time_pending_logout_v1";

  private subUser?: Subscription;
  private subEvents?: Subscription;
  branchId: any;
  userId: any;
  userRole: any;
  private readonly DIRECT_LOGOUT_ROLES = [
    "OWNER",
    "MANAGER",
    "CHIEF",
    "COM_PART",
  ];

  constructor(
    private authService: AuthService,
    private BranchService: BranchService,
    private router: Router,
    private userStateService: UserStateService,
    private snack: SnackbarService,
  ) {}

  ngOnInit(): void {
    const s = this.userStateService.getUserId();
    this.userId = s;
    this.userRole = this.userStateService.getRole();

    // FIRST: Try to restore pending logout state (DO THIS BEFORE LOADING SESSIONS)
    this.restorePendingLogoutState();

    // If there's an active pending logout, don't load sessions
    if (this.logoutPendingEvent) {
      // Listen for storage events from tp tabs
      window.addEventListener("storage", this.onStorageChange.bind(this));
      return;
    }

    // SECOND: If no pending logout, then load sessions normally
    this.loadSessions();
    this.loadEvents();

    if (this.activeSession && !this.activeSession.clockOut) {
      this.startStopwatch();
    }

    this.subEvents = this.BranchService.getLogoutStatus(this.userId).subscribe(
      (incoming: any) => {
        const arr = Array.isArray(incoming) ? incoming : [incoming];
        arr.forEach((ev: any) => this.processEvent(ev));
      },
    );

    // Listen for storage events from tp tabs
    window.addEventListener("storage", this.onStorageChange.bind(this));
  }

  ngOnDestroy(): void {
    this.stopTimers();
    this.stopBreakTimer();
    // DO NOT stop pending timer - let it continue even if component is destroyed
    if (this.subUser) this.subUser.unsubscribe();
    if (this.subEvents) this.subEvents.unsubscribe();
    window.removeEventListener("storage", this.onStorageChange.bind(this));
  }

  // ---------- storage sync helpers ----------
  private onStorageChange(event: StorageEvent): void {
    if (event.key === this.PENDING_LOGOUT_KEY && event.newValue) {
      try {
        const state: PendingLogoutState = JSON.parse(event.newValue);
        this.logoutPendingEvent = state.event;
        if (this.isPendingLogoutRole) {
          this.startPendingTimer(state.event);
        }
      } catch (e) {}
    }
  }

  // ---------- role helper ----------
  get isUserRole(): boolean {
    const role = String(this.userRole || "").toUpperCase();
    return role === "BRANCH" || role === "HEAD";
  }

  get isDirectLogoutRole(): boolean {
    const role = String(this.userRole || "").toUpperCase();
    return this.DIRECT_LOGOUT_ROLES.includes(role);
  }

  get isPendingLogoutRole(): boolean {
    return !this.isDirectLogoutRole;
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
      } catch {
        this.events = [];
      }
    }
  }

  saveEvents(): void {
    localStorage.setItem(this.EVENTS_KEY, JSON.stringify(this.events));
  }

  // ---------- pending logout persistence ----------
  private restorePendingLogoutState(): void {
    const data = localStorage.getItem(this.PENDING_LOGOUT_KEY);
    if (data) {
      try {
        const state: PendingLogoutState = JSON.parse(data);
        const now = Date.now();

        console.log("Pending logout found in storage", {
          targetTs: state.targetTs,
          now: now,
          remaining: state.targetTs - now,
        });

        // Check if the pending timeout has already expired
        if (state.targetTs <= now) {
          // Timeout expired, clear and redirect
          this.clearPendingLogoutStateOnly();
          this.clearAllSessions();
          this.router.navigateByUrl("/login");
          return;
        }

        // Restore the pending logout state
        this.logoutPendingEvent = state.event;

        if (this.isPendingLogoutRole) {
          this.startPendingTimer(state.event);
        }
      } catch (e) {
        this.clearPendingLogoutStateOnly();
      }
    }
  }

  private savePendingLogoutState(ev: UserEvent, targetTs: number): void {
    const state: PendingLogoutState = { event: ev, targetTs };
    localStorage.setItem(this.PENDING_LOGOUT_KEY, JSON.stringify(state));
    console.log("Saved pending logout state", {
      targetTs,
      remaining: targetTs - Date.now(),
    });
  }

  private clearPendingLogoutStateOnly(): void {
    localStorage.removeItem(this.PENDING_LOGOUT_KEY);
  }

  // ---------- Clear only sessions, not pending logout ----------
  private clearAllSessions(): void {
    localStorage.removeItem(this.SESSIONS_KEY);
    localStorage.removeItem(this.EVENTS_KEY);
    this.sessions = [];
    this.events = [];
    this.activeSession = undefined;
    this.stopTimers();
    this.elapsedTime = "00:00:00";
  }

  // ---------- Complete clear (only when logout is confirmed) ----------
  private completeLogout(): void {
    localStorage.removeItem(this.SESSIONS_KEY);
    localStorage.removeItem(this.EVENTS_KEY);
    localStorage.removeItem(this.PENDING_LOGOUT_KEY);
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
      message: raw.message,
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
        this.clearAllSessions();
        this.clearPendingLogoutStateOnly();
        this.events = [ev];
        this.saveEvents();
        this.startSessionFromEvent(ev);
        return;
      }

      if (!this.activeSession) {
        this.startSessionFromEvent(ev);
      }
    } else if (ev.eventType === "LOGOUT_PENDING") {
      this.logoutPendingEvent = ev;

      if (this.isPendingLogoutRole) {
        this.startPendingTimer(ev);
      } else {
        this.clearAllSessions();
        this.clearPendingLogoutStateOnly();
      }
    }

    if (ev.processed === true || ev.eventType === "LOGOUT_CONFIRMED") {
      this.completeLogout();
      this.router.navigateByUrl("/login");
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

  // ---------- pending time helpers ----------
  private resolvePendingTargetTs(ev: UserEvent): number {
    const messageTs = ev.message ? Date.parse(ev.message) : NaN;
    if (!Number.isNaN(messageTs)) return messageTs;

    const updatedTs = ev.updatedAt ? Date.parse(ev.updatedAt) : NaN;
    if (!Number.isNaN(updatedTs)) return updatedTs;

    return Date.now() + this.DEFAULT_PENDING_SECONDS * 1000;
  }

  getPendingTargetLabel(ev: UserEvent | null | undefined): string {
    if (!ev) return "-";
    const ts = this.resolvePendingTargetTs(ev);
    return this.formatTimestamp(
      ts,
      navigator.language || "en-US",
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    );
  }

  // ---------- logout / pending behavior ----------
  clockOutAndStartPending(): void {
    // Always clock out local session first
    if (this.activeSession && !this.activeSession.clockOut) {
      this.activeSession.clockOut = Date.now();
      this.saveSessions();
    }

    //  Direct logout roles → immediate logout
    if (this.isDirectLogoutRole) {
      this.authService.logout().subscribe(() => {
        this.completeLogout();
        window.location.href = "/login";
      });
      return;
    }

    // ❗ Prevent duplicate pending
    if (this.logoutPendingEvent) return;

    // ⏳ Pending logout flow
    this.authService.logout().subscribe({
      next: (res: any) => {
        const futureTime = res.message;
        const futureTs = futureTime ? Date.parse(futureTime) : NaN;

        // If backend didn’t send valid time → logout directly
        if (Number.isNaN(futureTs)) {
          this.completeLogout();
          window.location.href = "/login";
          return;
        }

        const pendingEvent: UserEvent = {
          eventType: "LOGOUT_PENDING",
          createdAt: new Date().toISOString(),
          updatedAt: new Date(futureTs).toISOString(),
          processed: false,
          event_id: `local-${Date.now()}`,
          message: futureTime,
        };

        this.savePendingLogoutState(pendingEvent, futureTs);

        this.events.push(pendingEvent);
        this.saveEvents();

        this.logoutPendingEvent = pendingEvent;
        this.startPendingTimer(pendingEvent);

        this.snack.show("Logout scheduled", 200);
      },
      error: (err: any) => {
        this.snack.show(err.error.error, err.error.status);
      },
    });
  }

  startPendingTimer(ev: UserEvent): void {
    this.stopPendingTimer();
    this.logoutPendingEvent = ev;

    const targetTs = this.resolvePendingTargetTs(ev);
    const now = Date.now();
    const initialRemaining = targetTs - now;

    console.log("Starting pending timer", {
      targetTs,
      now,
      initialRemaining,
    });

    const tick = () => {
      const now = Date.now();
      const remainingMs = targetTs - now;

      if (remainingMs <= 0) {
        this.pendingRemaining = this.formatDuration(0);
        this.stopPendingTimer();
        // Only clear pending logout, navigate to login
        this.clearPendingLogoutStateOnly();
        this.clearAllSessions();
        this.logoutPendingEvent = null;
        this.router.navigateByUrl("/login");
        return;
      }

      this.pendingRemaining = this.formatDuration(remainingMs);
    };

    // Initial tick
    tick();

    // Set interval to update every second
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
    tz = "UTC",
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
