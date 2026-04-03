import {
  Component,
  NgZone,
  OnInit,
  HostListener,
  ViewChild,
  ElementRef,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { NotificationChatService } from "../../pages/services/notification-chat.service";
import { AuthService } from "../../pages/services/auth.service";
import { SnackbarService } from "../snackbar/snackbar.service";
import { UserStateService } from "../../store/user-state.service";
import { SocketConfigService } from "../../pages/services/socket/socket-config.service";

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
  message?: string;
  id?: string;
  updatedAt?: string;
  type: string;
  read?: boolean;
  isRead?: boolean;
  unreadCount?: number;
  title?: string;
  queryMessage?: string | null;
  role?: string | null;
  rejectionReason?: string | null;
  rejectedBy?: string | null;
  [key: string]: any;
  relatedEntityId?: string;
}

interface TransientNotification {
  id: string;
  message: string;
  type: string;
  timestamp: Date;
  isHovered: boolean;
  icon: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  progress: number;
}

@Component({
  selector: "app-notification",
  templateUrl: "./notification.component.html",
  styleUrls: ["./notification.component.css"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationComponent implements OnInit, OnDestroy {
  @ViewChild("notificationContainer", { static: false })
  notificationContainer!: ElementRef;

  showNotifications = false;
  notifications: BackendThread[] = [];
  groupedNotifications: {
    data: Record<string, BackendThread[]>;
  } = {
    data: { upi: [], bank: [], payout: [], other: [] },
  };
  activeCategory: string = "all";
  filteredNotifications: BackendThread[] = [];
  activeTab: "branch" = "branch";
  filterType: "all" | "chat" | "approved" | "rejected" | "info" = "all";
  currentUserId: any;
  currentRoleName: any;
  currentRoleId: any;

  // Enhanced transient notifications with stack management
  toastStack: TransientNotification[] = [];
  private toastTimeouts: Map<string, any> = new Map();
  private toastProgressIntervals: Map<string, any> = new Map();

  // Popup properties
  showDetailsPopup = false;
  selectedNotification: any | null = null;

  ws: any;

  constructor(
    private notificationChatService: NotificationChatService,
    private authService: AuthService,
    private router: Router,
    private snackBar: SnackbarService,
    private userStateService: UserStateService,
    private socketConfigService: SocketConfigService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.userStateService.getUserId();
    this.currentRoleName = this.userStateService.getRole();
    this.currentRoleId = this.userStateService.getCurrentEntityId();

    this.getAllNotifications();

    this.socketConfigService.subscribeNotifications(this.currentRoleId);

    this.ws = this.socketConfigService.getNotifications().subscribe((data) => {
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

  @HostListener("document:click", ["$event"])
  onClickOutside(event: MouseEvent) {
    if (!this.showNotifications) return;
    const target = event.target as HTMLElement;
    if (this.notificationContainer) {
      const container = this.notificationContainer.nativeElement;
      if (!container.contains(target)) {
        this.showNotifications = false;
        this.cdr.markForCheck();
      }
    }
  }

  normalizeRoleKey(role: string | undefined | null) {
    if (!role) return "branch";
    return String(role).toLowerCase().replace(/\-/g, "_");
  }

  getAllNotifications() {
    this.notificationChatService
      .getAllNotifications(this.currentRoleId)
      .subscribe((data: any) => {
        const payload = Array.isArray(data) ? data : data ? [data] : [];
        const payload2 = payload[0]?.content || [];
        this.processIncomingData(payload2);
      });
  }

  ngOnDestroy(): void {
    if (this.ws) {
      this.ws.unsubscribe();
    }
    // Clear all toast timeouts and intervals
    this.toastTimeouts.forEach((timeout) => clearTimeout(timeout));
    this.toastProgressIntervals.forEach((interval) => clearInterval(interval));
    this.toastTimeouts.clear();
    this.toastProgressIntervals.clear();
  }

  private normalizeFundsType(title?: string | null) {
    if (!title) return "other";
    const t = String(title).toLowerCase();
    if (t.includes("upi")) return "upi";
    if (t.includes("bank")) return "bank";
    if (t.includes("payout")) return "payout";
    return "other";
  }

  processIncomingData(data: any[]) {
    if (!Array.isArray(data)) return;

    this.notifications = [];
    this.groupedNotifications = {
      data: { upi: [], bank: [], payout: [], other: [] },
    };

    data.forEach((it: any) => {
      if (it.threadId && !it.fundsId) return;
      if (it.rejectionReason) return;

      const readValue = it.read === true;

      const thread: BackendThread = {
        ...it,
        id: it.id || it.fundsId,
        fundsId: it.fundsId || it.id,
        fundsType: it.fundsType || (it.title ?? it.type),
        createdAt: it.createdAt || new Date().toISOString(),
        updatedAt: it.updatedAt || it.createdAt || new Date().toISOString(),
        read: readValue,
        type: it.type,
        isRead: readValue,
        unreadCount:
          typeof it.unreadCount === "number"
            ? it.unreadCount
            : it.unreadCount
              ? Number(it.unreadCount)
              : 0,
        queryMessage: it.queryMessage || it.lastMessage || null,
        message: it.message,
        createdByEntityType:
          it.createdByEntityType || (it.createdByType ?? null),
        createdByEntityId: it.createdByEntityId || null,
        createdByName: it.createdByName || null,
      };

      this.addOrUpdateThread(thread, false);
    });

    this.sortNotificationsByDate();
    this.applyFilter();
    this.cdr.markForCheck();
  }

  private sortNotificationsByDate() {
    this.notifications.sort((a, b) => {
      const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return dateB - dateA;
    });

    Object.keys(this.groupedNotifications.data).forEach((category) => {
      this.groupedNotifications.data[category].sort((a, b) => {
        const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return dateB - dateA;
      });
    });
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

    const fundsKey = this.normalizeFundsType(thread.title);
    Object.keys(this.groupedNotifications["data"]).forEach((k) => {
      this.groupedNotifications["data"][k] = this.groupedNotifications["data"][
        k
      ].filter((t) => t.id !== thread.id && t.fundsId !== thread.fundsId);
    });
    this.groupedNotifications["data"][fundsKey].unshift(thread);

    this.sortNotificationsByDate();
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
    this.cdr.markForCheck();
  }

  // canRedirectToChat(notification: BackendThread): boolean {
  //   if (!notification) return false;

  //   const type = (notification.type || "").toUpperCase();
  //   const rejectTypes = [
  //     "BANK_FUND_REJECT",
  //     "UPI_FUND_REJECT",
  //     "PAYOUT_FUND_REJECT",
  //   ];

  //   return !rejectTypes.includes(type);
  // }
  canRedirectToChat(notification: BackendThread): boolean {
    if (!notification) return false;

    const type = (notification.type || "").toUpperCase();

    const chatRedirectTypes = [
      "BANK_FUND_REJECT",
      "UPI_FUND_REJECT",
      "PAYOUT_FUND_REJECT",
    ];

    return chatRedirectTypes.includes(type);
  }

  openChat(notification: BackendThread) {
    if (!notification) return;

    // Check if this notification type should redirect to chat
    if (!this.canRedirectToChat(notification)) {
      this.openDetailsPopup(notification);
      return;
    }

    const notificationId = notification.id || "";
    const threadId = notification.relatedEntityId || "";

    notification.read = true;
    notification.isRead = true;
    notification.unreadCount = 0;

    this.notifications = [...this.notifications];

    const fundsKey = this.normalizeFundsType(notification.title);
    if (this.groupedNotifications.data[fundsKey]) {
      const index = this.groupedNotifications.data[fundsKey].findIndex(
        (n) => n.id === notification.id || n.fundsId === notification.fundsId,
      );
      if (index !== -1) {
        this.groupedNotifications.data[fundsKey][index] = { ...notification };
        this.groupedNotifications.data[fundsKey] = [
          ...this.groupedNotifications.data[fundsKey],
        ];
      }
    }

    this.cdr.markForCheck();

    // this.notificationChatService
    //   .SendNotificationAsRead(notificationId)
    //   .subscribe({
    //     next: () => {

    //     },
    //     error: (err) => console.error("Failed to mark notification read", err),
    //   });

    const entity = (notification.createdByEntityType || "BRANCH").toLowerCase();
    const role = (this.currentRoleName || "branch").toLowerCase();

    this.router.navigate([`/${role}/chat`], {
      queryParams: { threadId: threadId, chatType: entity },
    });

    this.showNotifications = false;
  }

  markAllNotificationsRead() {
    this.notificationChatService
      .markNotificationAsRead(this.currentRoleId)
      .subscribe({
        next: () => {
          this.notifications.forEach((n) => {
            n.isRead = true;
            n.unreadCount = 0;
          });
          this.cdr.markForCheck();
        },
      });
  }

  openDetailsPopup(notification: BackendThread) {
    this.selectedNotification = notification;
    this.showDetailsPopup = true;
    this.cdr.markForCheck();

    // const notificationId = notification.id || "";
    // this.notificationChatService
    //   .SendNotificationAsRead(notificationId)
    //   .subscribe({
    //     next: () => {

    //     },
    //     error: (err) =>
    //       console.error(
    //         "Failed to mark notification read from View button",
    //         err,
    //       ),
    //   });
  }

  closeDetailsPopup() {
    this.showDetailsPopup = false;
    this.selectedNotification = null;
    this.cdr.markForCheck();
  }

  getMaterialIcon(fundsType?: string): string {
    const type = (fundsType || "").toLowerCase();
    if (type.includes("upi")) return "smartphone";
    if (type.includes("bank")) return "account_balance";
    if (
      type.includes("payout") ||
      type.includes("payment") ||
      type.includes("pay")
    )
      return "payments";
    return "info";
  }

  /**
   * Get icon for toast notifications based on type
   */
  getToastIcon(type: string): string {
    const upperType = (type || "").toUpperCase();

    if (upperType.includes("BANK")) return "account_balance";
    if (upperType.includes("UPI")) return "smartphone";
    if (upperType.includes("PAYOUT")) return "payments";
    if (upperType.includes("REJECT")) return "error_outline";
    if (upperType.includes("APPROVED")) return "check_circle";
    if (upperType.includes("PENDING")) return "schedule";

    return "notifications";
  }

  /**
   * Get color scheme for toast based on type
   */
  getToastColors(type: string): {
    bg: string;
    border: string;
    text: string;
    icon: string;
  } {
    const upperType = (type || "").toUpperCase();

    if (upperType.includes("REJECT")) {
      return {
        bg: "rgb(254, 242, 242)",
        border: "rgb(248, 113, 113)",
        text: "rgb(153, 27, 27)",
        icon: "rgb(220, 38, 38)",
      };
    }
    if (upperType.includes("APPROVED")) {
      return {
        bg: "rgb(240, 253, 244)",
        border: "rgb(74, 222, 128)",
        text: "rgb(22, 101, 52)",
        icon: "rgb(34, 197, 94)",
      };
    }
    if (upperType.includes("PENDING")) {
      return {
        bg: "rgb(255, 251, 235)",
        border: "rgb(253, 186, 116)",
        text: "rgb(124, 45, 18)",
        icon: "rgb(251, 146, 60)",
      };
    }
    if (upperType.includes("BANK")) {
      return {
        bg: "rgb(239, 246, 255)",
        border: "rgb(96, 165, 250)",
        text: "rgb(30, 58, 138)",
        icon: "rgb(59, 130, 246)",
      };
    }
    if (upperType.includes("UPI")) {
      return {
        bg: "rgb(245, 235, 254)",
        border: "rgb(168, 85, 247)",
        text: "rgb(88, 28, 135)",
        icon: "rgb(147, 51, 234)",
      };
    }
    if (upperType.includes("PAYOUT")) {
      return {
        bg: "rgb(240, 253, 244)",
        border: "rgb(132, 204, 22)",
        text: "rgb(27, 94, 32)",
        icon: "rgb(101, 163, 13)",
      };
    }

    return {
      bg: "rgb(249, 250, 251)",
      border: "rgb(209, 213, 219)",
      text: "rgb(75, 85, 99)",
      icon: "rgb(107, 114, 128)",
    };
  }

  /**
   * Enhanced toast notification management
   */
  private showToastNotification(message: string, type: string = "info") {
    const nid = `t-${Date.now()}-${Math.random()}`;
    const icon = this.getToastIcon(type);
    const colors = this.getToastColors(type);

    const transientNotif: TransientNotification = {
      id: nid,
      message,
      type,
      timestamp: new Date(),
      isHovered: false,
      icon,
      backgroundColor: colors.bg,
      borderColor: colors.border,
      textColor: colors.text,
      progress: 100,
    };

    // Run outside Angular zone for better performance
    this.ngZone.run(() => {
      this.toastStack.push(transientNotif);
      this.cdr.markForCheck();

      // Progress animation
      let progress = 100;
      const progressInterval = setInterval(() => {
        if (!transientNotif.isHovered) {
          progress -= 1.67; // Decrease by 1.67% every 66.8ms for 4 seconds total
          transientNotif.progress = Math.max(progress, 0);

          if (progress <= 0) {
            clearInterval(progressInterval);
            this.toastProgressIntervals.delete(nid);
          }

          this.cdr.markForCheck();
        }
      }, 66.8);

      this.toastProgressIntervals.set(nid, progressInterval);

      // Auto-remove after 4 seconds if not hovered
      const timeout = setTimeout(() => {
        this.ngZone.run(() => {
          this.removeToastNotification(nid);
        });
      }, 4000);

      this.toastTimeouts.set(nid, timeout);
    });
  }

  onToastHover(toastId: string, isHovered: boolean) {
    const toast = this.toastStack.find((t) => t.id === toastId);
    if (toast) {
      toast.isHovered = isHovered;
      this.cdr.markForCheck();

      if (isHovered) {
        // Clear the timeout when hovering
        const timeout = this.toastTimeouts.get(toastId);
        if (timeout) {
          clearTimeout(timeout);
        }
      } else {
        // Restart timeout when leaving hover
        const timeout = setTimeout(() => {
          this.ngZone.run(() => {
            this.removeToastNotification(toastId);
          });
        }, 4000);
        this.toastTimeouts.set(toastId, timeout);
      }
    }
  }

  removeToastNotification(toastId: string) {
    const index = this.toastStack.findIndex((t) => t.id === toastId);
    if (index > -1) {
      this.toastStack.splice(index, 1);
      this.cdr.markForCheck();
    }

    const timeout = this.toastTimeouts.get(toastId);
    if (timeout) {
      clearTimeout(timeout);
      this.toastTimeouts.delete(toastId);
    }

    const progressInterval = this.toastProgressIntervals.get(toastId);
    if (progressInterval) {
      clearInterval(progressInterval);
      this.toastProgressIntervals.delete(toastId);
    }
  }

  getDisplayFields(obj: any): { key: string; value: any }[] {
    if (!obj || typeof obj !== "object") return [];
    return Object.keys(obj)
      .filter((key) => {
        const lower = key.toLowerCase();
        return (
          !lower.includes("id") &&
          ![
            "fundsid",
            "createdbyid",
            "createdbyentityid",
            "updatedbyid",
            "isread",
            "read",
            "unreadcount",
            "rejectedby",
            "rejectionreason",
            "rejectionthreadmember",
            "rejectionthreadmembers",
            "bankundfs",
            "upifunds",
          ].includes(lower) &&
          obj[key] !== null &&
          obj[key] !== undefined &&
          typeof obj[key] !== "object"
        );
      })
      .map((key) => ({
        key: this.formatKey(key),
        value: this.formatValue(obj[key]),
      }));
  }

  private formatKey(key: string): string {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .replace(/_/g, " ");
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) return "—";
    if (typeof value === "object") {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return "[Complex Value]";
      }
    }
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (value instanceof Date) return value.toLocaleString();
    return String(value);
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

    pushGroup(this.groupedNotifications.data);

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
    return this.notifications.reduce((acc, n) => acc + (n.unreadCount || 0), 0);
  }

  trackById(index: number, item: BackendThread) {
    return item.id || item.fundsId;
  }

  trackByToastId(index: number, item: TransientNotification) {
    return item.id;
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
    const title = eventData.title || eventData.fundsType || null;

    const createdAt = eventData.createdAt || new Date().toISOString();
    const createdByEntityType =
      eventData.createdByEntityType || eventData.createdByType || null;

    if (eventData.threadId && !eventData.fundsId) {
      this.removeThread(
        threadId,
        eventData.createdByEntityType,
        eventData.fundsType,
        eventData.title,
      );
      return;
    }

    if (eventData.rejectionReason) {
      this.removeThread(
        threadId,
        eventData.createdByEntityType,
        eventData.fundsType,
        eventData.title,
      );
      return;
    }

    const existing = this.notifications.find(
      (n) => n.fundsId === threadId || n.id === threadId,
    );

    if (existing) {
      const wasRead = existing.isRead;

      existing.updatedAt = createdAt;
      if (type) existing.fundsType = type;
      if (title) existing.title = title;
      if (message) existing.message = message;

      if (eventData.read !== undefined) {
        existing.read = eventData.read === true;
        existing.isRead = eventData.read === true;
      } else if (!wasRead) {
        existing.isRead = false;
        existing.unreadCount =
          (existing.unreadCount || 0) +
          (typeof eventData.unreadCount === "number"
            ? eventData.unreadCount
            : 1);
      }

      (existing as any).lastMessage = message || (existing as any).lastMessage;
      (existing as any).type = type || (existing as any).type;
      (existing as any).title = title || (existing as any).title;
      (existing as any).message = message || (existing as any).message;

      this.addOrUpdateThread(existing, true);
    } else {
      const readValue = eventData.read === true;

      const newItem: BackendThread = {
        fundsId: threadId,
        id: threadId,
        createdAt,
        updatedAt: createdAt,
        fundsType: title || type,
        message: message,
        type: type,
        createdByName: eventData.senderName || eventData.createdByName || "—",
        createdByEntityType: createdByEntityType || "BRANCH",
        read: readValue,
        isRead: readValue,
        unreadCount:
          typeof eventData.unreadCount === "number" ? eventData.unreadCount : 1,
        queryMessage: message || null,
        role: eventData.role || null,
      };

      this.addOrUpdateThread(newItem, true);
    }

    // Show professional toast notification
    if (message) {
      this.showToastNotification(message, type || "info");
    }

    this.applyFilter();
    this.sortNotificationsByDate();
    this.cdr.markForCheck();
  }

  private removeThread(
    threadId: string,
    entityType: string | null,
    fundsType: string | null,
    title: string | null,
  ) {
    const existingIndex = this.notifications.findIndex(
      (n) => n.fundsId === threadId || n.id === threadId,
    );
    if (existingIndex > -1) {
      this.notifications.splice(existingIndex, 1);
    }

    const fundsKey = this.normalizeFundsType(title);
    if (
      this.groupedNotifications["data"] &&
      this.groupedNotifications["data"][fundsKey]
    ) {
      this.groupedNotifications["data"][fundsKey] = this.groupedNotifications[
        "data"
      ][fundsKey].filter((t) => t.fundsId !== threadId && t.id !== threadId);
    }

    this.cdr.markForCheck();
  }

  getGroupCount(group: "data"): number {
    let count = 0;
    for (const cat of ["upi", "bank", "payout", "other"]) {
      count += this.groupedNotifications[group][cat].length;
    }
    return count;
  }

  getTotalCount(): number {
    return this.getGroupCount("data");
  }

  shouldShowCategory(group: "data", category: string): boolean {
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
    this.cdr.markForCheck();
  }

  markAllAsRead(): void {
    this.notifications.forEach((n) => {
      n.isRead = true;
      n.unreadCount = 0;
    });
    this.cdr.markForCheck();
  }

  getFieldIcon(fieldKey: string): string {
    const key = fieldKey.toLowerCase();
    if (key.includes("type")) return "category";
    if (key.includes("title")) return "title";
    if (key.includes("message")) return "message";
    if (
      key.includes("date") ||
      key.includes("time") ||
      key.includes("created") ||
      key.includes("updated")
    )
      return "schedule";
    if (key.includes("name")) return "person";
    if (key.includes("amount")) return "attach_money";
    if (key.includes("status")) return "info";
    if (key.includes("upi")) return "smartphone";
    if (key.includes("bank")) return "account_balance";
    if (key.includes("payout")) return "payments";
    return "label";
  }
}
