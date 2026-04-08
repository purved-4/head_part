import {
  Component,
  NgZone,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  Input,
  Output,
  EventEmitter
} from "@angular/core";
import { CommonModule, DatePipe } from "@angular/common";
import { Router } from "@angular/router";
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

interface SidebarNotification extends BackendThread {
  isSelected?: boolean;
}

@Component({
  selector: "app-sidebar-notification",
  templateUrl: "./sidebar-notification.component.html",
  styleUrls: ["./sidebar-notification.component.css"],
})
export class SidebarNotificationComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() notificationClick = new EventEmitter<BackendThread>();
@Output() unreadCountChange = new EventEmitter<number>();
  notifications: SidebarNotification[] = [];
  groupedNotifications: {
    data: Record<string, SidebarNotification[]>;
  } = {
    data: { upi: [], bank: [], payout: [], other: [] },
  };
  
  activeCategory: string = "all";
  activeTab: "branch" = "branch";
  currentUserId: any;
  currentRoleName: any;
  currentRoleId: any;
  isLoading = false;

  // Selected notification for details view
  selectedNotification: any | null = null;
  showDetailsPanel = false;

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

  ngOnDestroy(): void {
    if (this.ws) {
      this.ws.unsubscribe();
    }
  }

  getAllNotifications() {
    this.isLoading = true;
    this.notificationChatService
      .getAllNotifications(this.currentRoleId)
      .subscribe({
        next: (data: any) => {
          const payload = Array.isArray(data) ? data : data ? [data] : [];
          const payload2 = payload[0]?.content || [];
          this.processIncomingData(payload2);
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
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

      const thread: SidebarNotification = {
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
        isSelected: false,
      };

      this.addOrUpdateThread(thread, false);
    });

    this.sortNotificationsByDate();
      this.unreadCountChange.emit(this.getUnreadCount());

    this.cdr.detectChanges();
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

  private addOrUpdateThread(thread: SidebarNotification, toFront = true) {
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

  closeSidebar() {
    this.close.emit();
  }

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

onNotificationSelect(notification: SidebarNotification) {
  // Mark as selected
  this.notifications.forEach(n => n.isSelected = false);
  notification.isSelected = true;
  
  // Mark as read
  if (!notification.isRead) {
    notification.isRead = true;
    notification.unreadCount = 0;
    this.markAsRead(notification.id || notification.fundsId || "");
  }
  
  // If you want to keep the details panel, keep this:
  this.selectedNotification = notification;
  this.showDetailsPanel = true;
  
  // OR if you want to open popup on main click instead, use:
  // this.openDetailsPopup(notification);
  
  this.notificationClick.emit(notification);
  this.cdr.detectChanges();
}

  // private markAsRead(notificationId: string) {
  //   this.notificationChatService.SendNotificationAsRead(notificationId).subscribe({
  //     next: () => {},
  //     error: (err) => console.error("Failed to mark notification read", err),
  //   });
  // }

  private markAsRead(notificationId: string) {
  if (!notificationId) return;
  
  this.notificationChatService.SendNotificationAsRead(notificationId).subscribe({
    next: () => {
      // Update local state
      this.unreadCountChange.emit(this.getUnreadCount());
      this.getUnreadCount();
      this.cdr.detectChanges();
    },
    error: (err) => console.error("Failed to mark notification read", err),
  });
}

  // openChat(notification: BackendThread, event: Event) {
  //   event.stopPropagation();
    
  //   if (!this.canRedirectToChat(notification)) {
  //     this.onNotificationSelect(notification as SidebarNotification);
  //     return;
  //   }

  //   const threadId = notification.relatedEntityId || "";
  //   const entity = (notification.createdByEntityType || "BRANCH").toLowerCase();
  //   const role = (this.currentRoleName || "branch").toLowerCase();

  //   this.router.navigate([`/${role}/chat`], {
  //     queryParams: { threadId: threadId, chatType: entity },
  //   });

  //   this.closeSidebar();
  // }
openChat(notification: BackendThread, event?: Event) {
  if (event) {
    event.stopPropagation();
  }
  
  if (!this.canRedirectToChat(notification)) {
    this.onNotificationSelect(notification as SidebarNotification);
    return;
  }

  const threadId = notification.relatedEntityId || "";
  const entity = (notification.createdByEntityType || "BRANCH").toLowerCase();
  const role = (this.currentRoleName || "branch").toLowerCase();

  this.router.navigate([`/${role}/chat`], {
    queryParams: { threadId: threadId, chatType: entity },
  });

  this.closeSidebar();
}


  markAllAsRead() {
    this.notificationChatService.markNotificationAsRead(this.currentRoleId).subscribe({
      next: () => {
        this.notifications.forEach((n) => {
          n.isRead = true;
          n.unreadCount = 0;
        });
              this.unreadCountChange.emit(0);
        this.cdr.detectChanges();
      },
    });
  }

  getUnreadCount(): number {
    return this.notifications.reduce((acc, n) => acc + (n.unreadCount || 0), 0);
  }

  getAllNotificationsFlat(): SidebarNotification[] {
  return this.notifications; // already sorted
}

  getTotalCount(): number {
    let count = 0;
    for (const cat of ["upi", "bank", "payout", "other"]) {
      count += this.groupedNotifications.data[cat].length;
    }
    return count;
  }

  filterByCategory(category: string): void {
    this.activeCategory = category;
    this.cdr.detectChanges();
  }

  shouldShowCategory(category: string): boolean {
    if (this.activeCategory === "all") {
      return this.groupedNotifications.data[category].length > 0;
    }
    return this.activeCategory === category && this.groupedNotifications.data[category].length > 0;
  }

  getMaterialIcon(fundsType?: string): string {
    const type = (fundsType || "").toLowerCase();
    if (type.includes("upi")) return "smartphone";
    if (type.includes("bank")) return "account_balance";
    if (type.includes("payout") || type.includes("payment") || type.includes("pay")) return "payments";
    return "notifications";
  }

  getCategoryColor(category: string): string {
    switch(category) {
      case 'upi': return 'purple';
      case 'bank': return 'blue';
      case 'payout': return 'green';
      default: return 'gray';
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

  getFieldIcon(fieldKey: string): string {
    const key = fieldKey.toLowerCase();
    if (key.includes("type")) return "category";
    if (key.includes("title")) return "title";
    if (key.includes("message")) return "message";
    if (key.includes("date") || key.includes("time") || key.includes("created") || key.includes("updated"))
      return "schedule";
    if (key.includes("name")) return "person";
    if (key.includes("amount")) return "attach_money";
    if (key.includes("status")) return "info";
    if (key.includes("upi")) return "smartphone";
    if (key.includes("bank")) return "account_balance";
    if (key.includes("payout")) return "payments";
    return "label";
  }

  closeDetailsPanel() {
    this.showDetailsPanel = false;
    this.selectedNotification = null;
    this.notifications.forEach(n => n.isSelected = false);
    this.cdr.detectChanges();
  }

  private handleSseUpdate(eventData: any) {
    if (!eventData) return;

    const threadId = eventData.threadId || eventData.fundsId || eventData.id;
    const message = eventData.queryMessage || eventData.message || eventData.query_message || null;
    const type = eventData.type || eventData.fundsType || null;
    const title = eventData.title || eventData.fundsType || null;
    const createdAt = eventData.createdAt || new Date().toISOString();
    const createdByEntityType = eventData.createdByEntityType || eventData.createdByType || null;

    if (eventData.threadId && !eventData.fundsId) {
      this.removeThread(threadId);
      return;
    }

    if (eventData.rejectionReason) {
      this.removeThread(threadId);
      return;
    }

    const existing = this.notifications.find(n => n.fundsId === threadId || n.id === threadId);

    if (existing) {
      existing.updatedAt = createdAt;
      if (type) existing.fundsType = type;
      if (title) existing.title = title;
      if (message) existing.message = message;

      if (eventData.read !== undefined) {
        existing.read = eventData.read === true;
        existing.isRead = eventData.read === true;
      } else if (!existing.isRead) {
        existing.unreadCount = (existing.unreadCount || 0) + 1;
      }

      this.addOrUpdateThread(existing, true);
    } else {
      const newItem: SidebarNotification = {
        fundsId: threadId,
        id: threadId,
        createdAt,
        updatedAt: createdAt,
        fundsType: title || type,
        message: message,
        type: type,
        createdByName: eventData.senderName || eventData.createdByName || "—",
        createdByEntityType: createdByEntityType || "BRANCH",
        read: false,
        isRead: false,
        unreadCount: 1,
        queryMessage: message || null,
        role: eventData.role || null,
        isSelected: false,
      };
      this.addOrUpdateThread(newItem, true);
    }

    this.cdr.detectChanges();
  }

  private removeThread(threadId: string) {
    const existingIndex = this.notifications.findIndex(
      (n) => n.fundsId === threadId || n.id === threadId,
    );
    if (existingIndex > -1) {
      this.notifications.splice(existingIndex, 1);
    }

    const fundsKey = this.normalizeFundsType("");
    if (this.groupedNotifications["data"] && this.groupedNotifications["data"][fundsKey]) {
      this.groupedNotifications["data"][fundsKey] = this.groupedNotifications["data"][fundsKey].filter(
        (t) => t.fundsId !== threadId && t.id !== threadId
      );
    }

    this.cdr.detectChanges();
  }

  trackById(index: number, item: SidebarNotification) {
    return item.id || item.fundsId;
  }

  // Date formatting methods (alternative to DatePipe)
  formatTime(dateString: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Today: show time
    if (diffDays === 0 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    // Yesterday
    if (diffDays === 1) {
      return 'Yesterday';
    }
    // Within 7 days: show day name
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    // Older: show date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  formatFullDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString([], { 
      year: 'numeric',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  showDetailsPopup = false;

openDetailsPopup(notification: any) {
  this.selectedNotification = notification;
  this.showDetailsPopup = true;
  this.cdr.detectChanges();
}

closeDetailsPopup() {
  this.showDetailsPopup = false;
  this.selectedNotification = null;
  this.cdr.detectChanges();
}

// Add this method to open popup from the button without triggering the parent click
openDetailsPopupFromButton(notification: any, event: Event) {
  event.stopPropagation(); // Prevent triggering the parent div click
  this.openDetailsPopup(notification);
}

openChatAndMarkRead(notification: any, event?: Event) {
  if (event) {
    event.stopPropagation();
  }
  
  // Mark notification as read first
  if (!notification.isRead) {
    notification.isRead = true;
    notification.unreadCount = 0;
    this.markAsRead(notification.id || notification.fundsId || "");
  }
  
  // Then open the chat - pass event as optional
  this.openChat(notification, event);
}

refreshNotifications() {
  this.getAllNotifications();
}
}