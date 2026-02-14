import {
  Component,
  NgZone,
  OnInit,
  HostListener,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NotificationChatService } from "../../pages/services/notification-chat.service";
import { AuthService } from "../../pages/services/auth.service";
import { SnackbarService } from "../snackbar/snackbar.service";
import { UserStateService } from "../../store/user-state.service";
import { SocketConfigService } from "../socket/socket-config.service";

interface BackendThread {
  bankFunds?: any;
  upiFunds?: any;
  createdAt?: string;
  createdById?: string;
  createdByName?: string | null;
  createdByEntityType?: string | null;
  createdByEntityId?: string | null;
  fundsId?: string;
  fundsType?: string;
  id?: string;
  updatedAt?: string;
  isRead?: boolean;
  unreadCount?: number;
  title?: string;
  queryMessage?: string | null;
  role?: string | null;
}

@Component({
  selector: "app-notificate-chat",
  templateUrl: "./notificate-chat.component.html",
  styleUrls: ["./notificate-chat.component.css"],
})
export class NotificateChatComponent implements OnInit {
  @ViewChild("notificationContainer", { static: true })
  notificationContainer!: ElementRef;

  showNotifications = false;
  notifications: BackendThread[] = [];
  groupedNotifications: {
    head: Record<string, BackendThread[]>;
    branch: Record<string, BackendThread[]>;
  } = {
    head: { upi: [], bank: [], payout: [], other: [] },
    branch: { upi: [], bank: [], payout: [], other: [] },
  };
  activeCategory: string = "all";
  filteredNotifications: BackendThread[] = [];
  activeTab: "head" | "branch" = "branch";
  filterType: "all" | "chat" | "approved" | "rejected" | "info" = "all";
  currentUserId: any;
  currentRoleName: any;
  currentRoleId: any;
  transientNotifications: { id: string; message: string }[] = [];

  sse: any;

  constructor(
    private zone: NgZone,
    private notificationChatService: NotificationChatService,
    private authService: AuthService,
    private router: Router,
    private snackBar: SnackbarService,
    private userStateService: UserStateService,
    private socketConfigService: SocketConfigService,
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.userStateService.getUserId();
    this.currentRoleName = this.userStateService.getRole();
    this.currentRoleId = this.userStateService.getCurrentRoleId();

    this.getThreadByRoleAndId(this.currentRoleName, this.currentRoleId);

    this.socketConfigService.subscribeThreads(this.currentRoleId);

    this.sse = this.socketConfigService.getThreads().subscribe((data) => {
      if (!data) return;
      if (Array.isArray(data.threads)) {
        this.processIncomingData(data.threads);
      } else if (data.threads) {
        this.processIncomingData([data.threads]);
      } else {
        this.handleSseUpdate(data);
      }
    });
  }

  // Close panel when clicking outside
  @HostListener("document:click", ["$event"])
  onClickOutside(event: MouseEvent) {
    if (!this.showNotifications) return;
    const target = event.target as HTMLElement;
    const container = this.notificationContainer.nativeElement;
    if (!container.contains(target)) {
      this.showNotifications = false;
    }
  }

  normalizeRoleKey(role: string | undefined | null) {
    if (!role) return "branch";
    return String(role).toLowerCase().replace(/\-/g, "_");
  }

  getCategoryStyle(category: string) {
    if (this.activeCategory === category) {
      const categoryColors: Record<string, string> = {
        upi: "#805AD5",
        bank: "#3182CE",
        payout: "#38A169",
        other: "#718096",
      };
      return {
        background: categoryColors[category] + "10",
        color: categoryColors[category],
        borderColor: categoryColors[category] + "30",
      } as { [k: string]: string };
    }
    return {} as { [k: string]: string };
  }

  getThreadByRoleAndId(currentRoleName: any, currentUserId: any) {
    if (!currentRoleName || !currentUserId) return;

    if (String(currentRoleName).toLowerCase() === "branch") {
      this.notificationChatService
        .getThreadByBranchIdWithIsResolved(
          currentUserId,
          currentRoleName,
          false,
          "all",
        )
        .subscribe(
          (data: any) => {
            console.log(data);
            const payload = Array.isArray(data) ? data : data ? [data] : [];
            this.processIncomingData(payload);
          },
          (error) => {
            console.error("Error fetching thread data:", error);
          },
        );
      return;
    }

    this.notificationChatService
      .getAllThreadForHeadAndBranch(
        currentUserId,
        currentRoleName,
        false,
        "all",
      )
      .subscribe(
        (data: any) => {
          const payload = Array.isArray(data) ? data : data ? [data] : [];
          this.processIncomingData(payload);
        },
        (error) => {
          console.error("Error fetching thread data:", error);
        },
      );
  }

  private normalizeFundsType(fundsType?: string | null) {
    if (!fundsType) return "other";
    const t = String(fundsType).toLowerCase();
    if (t.includes("upi")) return "upi";
    if (t.includes("bank")) return "bank";
    if (t.includes("payout") || t.includes("pay") || t.includes("payment"))
      return "payout";
    return "other";
  }

  processIncomingData(data: any[]) {
    if (!Array.isArray(data)) return;
    this.notifications = [];
    this.groupedNotifications = {
      head: { upi: [], bank: [], payout: [], other: [] },
      branch: { upi: [], bank: [], payout: [], other: [] },
    };

    data.forEach((it: any) => {
      const thread: BackendThread = {
        ...it,
        id: it.id || it.fundsId,
        fundsId: it.fundsId || it.id,
        fundsType: it.fundsType || (it.type ?? "info"),
        createdAt: it.createdAt || new Date().toISOString(),
        updatedAt: it.updatedAt || it.createdAt || new Date().toISOString(),
        isRead: !!it.isRead,
        unreadCount:
          typeof it.unreadCount === "number"
            ? it.unreadCount
            : it.unreadCount
              ? Number(it.unreadCount)
              : 0,
        queryMessage: it.queryMessage || it.lastMessage || null,
        createdByEntityType:
          it.createdByEntityType || (it.createdByType ?? null),
        createdByEntityId: it.createdByEntityId || null,
        createdByName: it.createdByName || null,
      };

      this.addOrUpdateThread(thread, false);
    });

    this.applyFilter();
  }

  private addOrUpdateThread(thread: BackendThread, toFront = true) {
    const existingIndex = this.notifications.findIndex(
      (n) => n.id === thread.id || n.fundsId === thread.fundsId,
    );
    if (existingIndex > -1) {
      const ex = this.notifications[existingIndex];
      const merged = { ...ex, ...thread };
      this.notifications.splice(existingIndex, 1);
      if (toFront) this.notifications.unshift(merged);
      else this.notifications.push(merged);
    } else {
      if (toFront) this.notifications.unshift(thread);
      else this.notifications.push(thread);
    }

    const entity =
      (thread.createdByEntityType || "BRANCH").toString().toUpperCase() ===
      "HEAD"
        ? "head"
        : "branch";
    const fundsKey = this.normalizeFundsType(thread.fundsType);
    Object.keys(this.groupedNotifications[entity]).forEach((k) => {
      this.groupedNotifications[entity][k] = this.groupedNotifications[entity][
        k
      ].filter((t) => t.id !== thread.id && t.fundsId !== thread.fundsId);
    });
    this.groupedNotifications[entity][fundsKey].unshift(thread);
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
  }

  openChat(notification: BackendThread) {
    if (!notification) return;
    notification.isRead = true;
    notification.unreadCount = 0;

    const navId = notification.fundsId || notification.id || "";
    const entity = (notification.createdByEntityType || "")
      .toString()
      .toUpperCase();
    if (entity === "BRANCH") {
      this.router.navigate(["/branch-chat"], {
        queryParams: { threadId: navId },
      });
    } else {
      this.router.navigate(["/head-chat"], {
        queryParams: { threadId: navId },
      });
    }
  }

  filterNotifications(type: "all" | "chat" | "approved" | "rejected" | "info") {
    this.filterType = type;
    this.applyFilter();
  }

  private applyFilter() {
    const flattened: BackendThread[] = [];

    const pushGroup = (group: Record<string, BackendThread[]>) => {
      ["upi", "bank", "payout", "other"].forEach((k) => {
        if (Array.isArray(group[k])) flattened.push(...group[k]);
      });
    };

    pushGroup(this.groupedNotifications.head);
    pushGroup(this.groupedNotifications.branch);

    if (this.filterType === "all") {
      this.filteredNotifications = flattened;
    } else if (this.filterType === "chat") {
      this.filteredNotifications = flattened;
    } else {
      this.filteredNotifications = flattened.filter((n) => {
        const t = ((n as any).type || n.fundsType || "")
          .toString()
          .toLowerCase();
        return t === this.filterType;
      });
    }
  }

  getNotificationIcon(fundsType?: string): string {
    const type = (fundsType || "").toLowerCase();
    if (type.includes("bank")) return "🏦";
    if (type.includes("upi")) return "💳";
    if (
      type.includes("payout") ||
      type.includes("payment") ||
      type.includes("pay")
    )
      return "💰";
    return "📢";
  }

  getUnreadCount(): number {
    return this.notifications.reduce(
      (acc, n) => acc + (n.unreadCount || (n.isRead ? 0 : 0)),
      0,
    );
  }

  private handleSseUpdate(eventData: any) {
    if (!eventData) return;

    const threadId = eventData.threadId || eventData.fundsId || eventData.id;
    const message =
      eventData.queryMessage ||
      eventData.message ||
      eventData.query_message ||
      null;
    const type = eventData.type || eventData.fundsType || null;
    const createdAt = eventData.createdAt || new Date().toISOString();
    const createdByEntityType =
      eventData.createdByEntityType || eventData.createdByType || null;

    const existing = this.notifications.find(
      (n) => n.fundsId === threadId || n.id === threadId,
    );

    if (existing) {
      existing.updatedAt = createdAt;
      if (type) existing.fundsType = type;
      existing.isRead = false;
      existing.unreadCount =
        (existing.unreadCount || 0) +
        (typeof eventData.unreadCount === "number" ? eventData.unreadCount : 1);
      (existing as any).lastMessage = message || (existing as any).lastMessage;
      (existing as any).type = type || (existing as any).type;

      this.addOrUpdateThread(existing, true);
    } else {
      const newItem: BackendThread = {
        fundsId: threadId,
        id: threadId,
        createdAt,
        updatedAt: createdAt,
        fundsType: type || "info",
        createdByName: eventData.senderName || eventData.createdByName || "—",
        createdByEntityType: createdByEntityType || "BRANCH",
        isRead: false,
        unreadCount:
          typeof eventData.unreadCount === "number" ? eventData.unreadCount : 1,
        queryMessage: message || null,
        role: eventData.role || null,
      };
      (newItem as any).lastMessage = message;
      (newItem as any).type = type;
      this.addOrUpdateThread(newItem, true);
    }

    if (message) {
      const nid = `t-${Date.now()}`;
      this.transientNotifications.push({ id: nid, message });
      setTimeout(() => {
        this.transientNotifications = this.transientNotifications.filter(
          (t) => t.id !== nid,
        );
      }, 3000);
    }

    try {
      if (typeof this.snackBar.show === "function" && message) {
        this.snackBar.show(`New: ${message}`, true);
      }
    } catch (e) {
      console.warn("Snackbar failed:", e);
    }

    this.applyFilter();
  }

  getGroupCount(group: "head" | "branch"): number {
    let count = 0;
    for (const cat of ["upi", "bank", "payout", "other"]) {
      count += this.groupedNotifications[group][cat].length;
    }
    return count;
  }

  getTotalCount(): number {
    return this.getGroupCount("head") + this.getGroupCount("branch");
  }

  shouldShowCategory(group: "head" | "branch", category: string): boolean {
    if (this.activeCategory === "all") {
      return this.groupedNotifications[group][category].length > 0;
    }
    return (
      this.activeCategory === category &&
      this.groupedNotifications[group][category].length > 0
    );
  }

  filterByCategory(category: string): void {
    this.activeCategory = category;
  }

  markAllAsRead(): void {
    this.notifications.forEach((n) => {
      n.isRead = true;
      n.unreadCount = 0;
    });
  }
}
