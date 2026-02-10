import {
  Component,
  NgZone,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewInit,
  HostListener,
} from "@angular/core";
import { Subscription } from "rxjs";
import { NotificationChatService } from "../../pages/services/notification-chat.service";
import { SnackbarService } from "../snackbar/snackbar.service";
import { ActivatedRoute, Router } from "@angular/router";
import { UserStateService } from "../../store/user-state.service";
import { SocketConfigService } from "../socket/socket-config.service";
import { WebsiteService } from "../../pages/services/website.service";
import { FundsService } from "../../pages/services/funds.service";
import { emojiCategories } from "../../utils/constants";
import baseUrl, { fileBaseUrl } from "../../pages/services/helper";

interface GroupMessage {
  id: string;
  senderId: string | null;
  senderName: string;
  senderAvatar: string;
  senderRole?: string | null;
  text: string;
  time: string;
  type: "text" | "image" | "video" | "audio" | "file";
  mediaUrl?: string | null;
  isCurrentUser?: boolean;
}

interface GroupParticipant {
  id: string;
  userId: string;
  userName: string;
  avatar: string;
  online: boolean;
  role?: string | null;
}

interface Notification {
  id: string;
  groupName: string;
  avatar: string;
  lastMessage: string;
  lastSender: string;
  time: string;
  unread: number;
  participantCount: number;
  participants: GroupParticipant[];
  messages: GroupMessage[];
  _raw?: any;
  role?: string | null;
  websiteId?: string;
  resolved?: boolean;
  fundId?: string;
  fundType?: string;
  threadType?: string;
  name?: string;
}

@Component({
  selector: "app-head-branch-chat",
  templateUrl: "./head-branch-chat.component.html",
  styleUrl: "./head-branch-chat.component.css",
})
export class HeadBranchChatComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild("messagesContainer") messagesContainer!: ElementRef<HTMLElement>;
  @ViewChild("threadsContainer") threadsContainer!: ElementRef<HTMLElement>;

  notifications: Notification[] = [];
  selectedNotification: Notification | null = null;
  newMessage: string = "";
  showParticipants: boolean = false;

  showMediaViewer: boolean = false;
  currentMediaUrl: string = "";
  currentMediaName: string = "";
  currentMediaType: "image" | "video" | "audio" | "file" | "text" = "text";
  sidebarWidth: number = 384;
  showEmojiPicker: boolean = false;
  emojis: string[] = [];
  activeEmojiCategory: string = "smileys";
  emojiSearchTerm: string = "";

  branchId: any;
  currentUserId: any;
  role: any;

  private realTimeSub: Subscription | null = null;
  private listSub: Subscription | null = null;
  private participantsMap: Map<string, GroupParticipant> = new Map();

  pageSize = 15;
  currentPage = 0;
  loadingMessages = false;
  noMoreMessages = false;
  lastScrollTop = 0;

  selectedQuestion: any = null;

  selectedQuestionTwo: any = null;

  websiteId: any;

  loadingThreads: boolean = false;

  showUploadPopup: boolean = false;
  selectedUploadFile: File | null = null;
  uploadingFile: boolean = false;
  uploadProgress: number = 0; // optional if backend supports progress
  uploadedFileId: string | null = null;
  uploadedFileUrl: string | null = null;
  uploadMessage: string = ""; // input for message/description to send with file
  uploadError: string | null = null;

  isZoomed = false;
zoomLevel = 1;
currentMediaIndex = 0;
mediaFiles: any[] = [];
currentFileSize: number = 0;
currentMediaDate: Date = new Date();
videoDuration: number = 0;
videoCurrentTime: number = 0;
audioCurrentTime: number = 0;
audioDuration: number = 0;
isAudioPlaying = false;
showCopiedMessage = false;
openedTime = new Date();

  private ROLE_PALETTE: Record<string, any> = {
    owner: {
      primary: "#5A0B95",
      secondary: "#FFDF80",
      bg: "#F8F5FF",
      font: "#FFFFFF",
      border: "#E6C44A",
      hover: "#6B1FB3",
      glow: "rgba(90,11,149,0.50)",
    },
    other: {
      primary: "#5A0B95",
      secondary: "#FFDF80",
      bg: "#F8F5FF",
      font: "#FFFFFF",
      border: "#E6C44A",
      hover: "#6B1FB3",
      glow: "rgba(90,11,149,0.50)",
    },
    chief: {
      primary: "#1A56DB",
      secondary: "#4F83E8",
      bg: "#F0F7FF",
      font: "#FFFFFF",
      border: "#1E429F",
      hover: "#1E4BBB",
      glow: "rgba(26,86,219,0.50)",
    },
    manager: {
      primary: "#1E7B1E",
      secondary: "#5CB85C",
      bg: "#F2FCF2",
      font: "#FFFFFF",
      border: "#2D682D",
      hover: "#259225",
      glow: "rgba(30,123,30,0.50)",
    },
    head: {
      primary: "#E67A00",
      secondary: "#FFB366",
      bg: "#FFF9F2",
      font: "#FFFFFF",
      border: "#CC6A00",
      hover: "#FF8A1A",
      glow: "rgba(230,122,0,0.50)",
    },
    branch: {
      primary: "#FFC61A",
      secondary: "#FFE699",
      bg: "#FFFDF2",
      font: "#1F2937",
      border: "#E6B800",
      hover: "#FFD54F",
      glow: "rgba(255,198,26,0.50)",
    },
  };
  sse: any;
  subscribedThreadId: any;
  questions: any[] = [];
  questionSearchTerm: any;
  filteredQuestions: any[] = [];
  showQuestionDropDown: any = false;
    showQuestionDropDownTwo: any = false;


  showFundPopup: boolean = false;
  fundData: any = null;
  loadingFund: boolean = false;

  activeTab: "all" | "resolved" | "unresolved" = "unresolved";

  allNotifications: Notification[] = [];
  resolvedNotifications: Notification[] = [];
  unresolvedNotifications: Notification[] = [];

  fundTypeFilter: "all" | "upi" | "bank" | "payout" = "all";
  searchTerm: string = "";
  filteredNotifications: Notification[] = [];
  JSON: any = JSON;
  emojiCategories = emojiCategories;

  // Thread Pagination Properties
  threadPage: number = 0;
  threadPageSize: number = 10;
  totalThreads: number = 0;
  totalThreadPages: number = 0;
  loadingMoreThreads: boolean = false;
  threadLastScrollTop: number = 0;
  hasMoreThreads: boolean = true;

  constructor(
    private zone: NgZone,
    private notificationChatService: NotificationChatService,
    private snackBar: SnackbarService,
    private userStateService: UserStateService,
    private socketConfigService: SocketConfigService,
    private websiteService: WebsiteService,
    private fundService: FundsService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.branchId = this.userStateService.getCurrentRoleId();
    this.currentUserId = this.userStateService.getUserId();
    this.role = this.userStateService.getRole();

    if (this.branchId) {
      this.loadThreads();
    }

    this.socketConfigService.subscribeUnreadThreads(this.branchId);

    this.socketConfigService.getUnreadThreads().subscribe((res: any) => {
      if (!res) return;

      const threadId: string | undefined =
        res.threadId || res.thread || res.id || undefined;
      const unreadCount: number =
        typeof res.unreadCount === "number"
          ? res.unreadCount
          : typeof res.unread === "number"
            ? res.unread
            : 0;

      if (!threadId) return;

      this.zone.run(() => {
        this.updateUnreadCount(threadId, unreadCount);
      });
    });

    this.sse = this.socketConfigService.getThreads().subscribe((data) => {
      if (!data) return;
      const threads = data.threads || [];
      this.mergeNotificationsFromThreads(threads);
      this.applyFilters();
      this.handleThreadSelection();
    });
  }

  ngAfterViewInit(): void {
    try {
      this.lastScrollTop =
        this.messagesContainer?.nativeElement?.scrollTop || 0;
      this.threadLastScrollTop =
        this.threadsContainer?.nativeElement?.scrollTop || 0;
    } catch {}
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const emojiContainer = target.closest(".emoji-picker-container");
    if (!emojiContainer && this.showEmojiPicker) {
      this.showEmojiPicker = false;
      // this.showQuestionDropDown = false;
    }
    if (this.showQuestionDropDown) {
      this.showQuestionDropDown = false;
    }
  }

  ngOnDestroy(): void {
    if (this.sse) {
      try {
        this.sse.unsubscribe();
      } catch {}
      this.sse = undefined;
    }
    if (this.realTimeSub) {
      try {
        this.realTimeSub.unsubscribe();
      } catch {}
      this.realTimeSub = null;
    }
    if (this.listSub) {
      try {
        this.listSub.unsubscribe();
      } catch {}
      this.listSub = null;
    }

    if (this.subscribedThreadId) {
      try {
        (this.socketConfigService as any).unsubscribeMessagePage?.(
          this.subscribedThreadId,
        );
        (this.socketConfigService as any).unsubscribeMessages?.(
          this.subscribedThreadId,
        );
      } catch (e) {}
      this.subscribedThreadId = null;
    }

    try {
    } catch (e) {}
  }

  // Threads Scroll Handler
  onThreadsScroll(event: Event): void {
    if (
      !this.threadsContainer ||
      this.loadingMoreThreads ||
      !this.hasMoreThreads
    )
      return;

    const el = event.target as HTMLElement;
    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight;
    const clientHeight = el.clientHeight;

    // Check if scrolled to bottom (within 100px)
    if (scrollHeight - scrollTop - clientHeight <= 100) {
      this.loadMoreThreads();
    }

    this.threadLastScrollTop = scrollTop;
  }

  // Load More Threads
  loadMoreThreads(): void {
    if (this.loadingMoreThreads || !this.hasMoreThreads) return;

    this.loadingMoreThreads = true;
    this.threadPage++;

    // Load threads based on active tab
    switch (this.activeTab) {
      case "all":
        this.loadAllThreadsPaginated();
        break;
      case "resolved":
        this.loadResolvedThreadsPaginated(true);
        break;
      case "unresolved":
        this.loadResolvedThreadsPaginated(false);
        break;
    }
  }

  // Load All Threads with Pagination
  loadAllThreadsPaginated(): void {
    this.listSub = this.notificationChatService
      .getThreadByBranchId(this.branchId, this.role)
      .subscribe({
        next: (res: any) => {
          this.processPaginatedThreadResponse(res, "all");
        },
        error: (err) => {
          this.loadingThreads = false;
          this.loadingMoreThreads = false;
          this.snackBar.show("Failed to load threads", false);
        },
      });
  }

  // Load Resolved/Unresolved Threads with Pagination
  loadResolvedThreadsPaginated(isResolved: boolean): void {
    this.listSub = this.notificationChatService
      .getThreadByBranchIdWithIsResolvedPaginated(
        this.branchId,
        this.role,
        isResolved,
        this.fundTypeFilter,
        this.threadPage,
        this.threadPageSize,
      )
      .subscribe({
        next: (res: any) => {
          this.processPaginatedThreadResponse(
            res,
            isResolved ? "resolved" : "unresolved",
          );
        },
        error: (err) => {
          this.loadingThreads = false;
          this.loadingMoreThreads = false;
          this.snackBar.show("Failed to load threads", false);
        },
      });
  }

  // Process Paginated Thread Response
  private processPaginatedThreadResponse(res: any, tab: string): void {
    const threads = Array.isArray(res.content)
      ? res.content
      : Array.isArray(res)
        ? res
        : [];
    const mapped = threads.map((t: any) => this.mapThreadToNotification(t));

    this.totalThreads = res.total || res.totalElements || 0;
    this.totalThreadPages = Math.ceil(this.totalThreads / this.threadPageSize);

    // Check if we have more threads
    this.hasMoreThreads = threads.length === this.threadPageSize;

    if (this.threadPage === 0) {
      // First page, replace the array
      if (tab === "all") {
        this.allNotifications = mapped;
      } else if (tab === "resolved") {
        this.resolvedNotifications = mapped;
      } else {
        this.unresolvedNotifications = mapped;
      }
    } else {
      // Append to existing array
      if (tab === "all") {
        this.allNotifications = [...this.allNotifications, ...mapped];
      } else if (tab === "resolved") {
        this.resolvedNotifications = [...this.resolvedNotifications, ...mapped];
      } else {
        this.unresolvedNotifications = [
          ...this.unresolvedNotifications,
          ...mapped,
        ];
      }
    }

    this.applyFilters();

    // Auto-select first thread only on initial load
    if (this.threadPage === 0) {
      this.handleThreadSelection();
    }

    this.loadingThreads = false;
    this.loadingMoreThreads = false;
  }

  // Load Threads (initial load)
  loadThreads(): void {
    this.threadPage = 0;
    this.totalThreads = 0;
    this.totalThreadPages = 0;
    this.hasMoreThreads = true;
    // this.loadingThreads = true;

    switch (this.activeTab) {
      case "all":
        this.loadAllThreadsPaginated();
        break;
      case "resolved":
        this.loadResolvedThreadsPaginated(true);
        break;
      case "unresolved":
        this.loadResolvedThreadsPaginated(false);
        break;
    }
  }

  applyFilters(): void {
    let notifications: Notification[] = [];

    switch (this.activeTab) {
      case "all":
        notifications = [...this.allNotifications];
        break;
      case "resolved":
        notifications = [...this.resolvedNotifications];
        break;
      case "unresolved":
        notifications = [...this.unresolvedNotifications];
        break;
    }

    if (this.fundTypeFilter !== "all") {
      notifications = notifications.filter((notification) => {
        const fundType = notification.fundType?.toLowerCase();
        return fundType === this.fundTypeFilter;
      });
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      notifications = notifications.filter(
        (notification) =>
          notification.groupName.toLowerCase().includes(term) ||
          notification.lastMessage.toLowerCase().includes(term) ||
          notification.lastSender.toLowerCase().includes(term),
      );
    }

    notifications.sort((a, b) => {
      if (a.unread !== b.unread) {
        return b.unread - a.unread;
      }
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });

    this.filteredNotifications = notifications;
  }

  switchTab(tab: any): void {
    if (this.activeTab === tab) return;

    this.activeTab = tab;
    this.threadPage = 0;
    this.totalThreads = 0;
    this.totalThreadPages = 0;
    this.hasMoreThreads = true;
    this.loadThreads();
  }

  changeFundTypeFilter(type: any): void {
    this.fundTypeFilter = type;
    this.threadPage = 0;
    this.totalThreads = 0;
    this.totalThreadPages = 0;
    this.hasMoreThreads = true;
    this.loadThreads();
  }

  clearSearch(): void {
    this.searchTerm = "";
    this.applyFilters();
  }

  private updateUnreadCount(threadId: string, unreadCount: number): void {
    const updateArray = (arr: Notification[]) => {
      const idx = arr.findIndex((n) => n.id === threadId);
      if (idx > -1) {
        const notif = arr[idx];
        if (
          this.selectedNotification &&
          this.selectedNotification.id === threadId
        ) {
          notif.unread = 0;
          this.selectedNotification.unread = 0;
        } else {
          notif.unread = unreadCount;
        }
      }
    };

    updateArray(this.allNotifications);
    updateArray(this.resolvedNotifications);
    updateArray(this.unresolvedNotifications);

    const filteredIdx = this.filteredNotifications.findIndex(
      (n) => n.id === threadId,
    );
    if (filteredIdx > -1) {
      const notif = this.filteredNotifications[filteredIdx];
      if (
        this.selectedNotification &&
        this.selectedNotification.id === threadId
      ) {
        notif.unread = 0;
      } else {
        notif.unread = unreadCount;
      }
    }

    this.applyFilters();
  }

  getFundTypeBadgeClass(type: any): string {
    switch (type?.toLowerCase()) {
      case "upi":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "bank":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "payout":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  getFundTypeIcon(type: string): string {
    switch (type?.toLowerCase()) {
      case "upi":
        return "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z";
      case "bank":
        return "M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3";
      case "payout":
        return "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z";
      default:
        return "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z";
    }
  }

  private handleThreadSelection(): void {
    if (this.filteredNotifications.length > 0) {
      const threadId = this.route.snapshot.queryParamMap.get("threadId");
      if (threadId) {
        const matchedNotification = this.filteredNotifications.find(
          (n) => n.id === threadId,
        );
        if (matchedNotification) {
          if (
            !this.selectedNotification ||
            this.selectedNotification.id !== matchedNotification.id
          ) {
            this.selectNotification(matchedNotification);
          }
        } else if (!this.selectedNotification) {
          this.selectNotification(this.filteredNotifications[0]);
        }
      } else if (!this.selectedNotification) {
        this.selectNotification(this.filteredNotifications[0]);
      }
    }
  }

  private mergeNotificationsFromThreads(threads: any[]): void {
    const mapped = (threads || []).map((t: any) =>
      this.mapThreadToNotification(t),
    );

    for (const n of mapped) {
      this.updateNotificationInArray(this.allNotifications, n);
      this.updateNotificationInArray(this.resolvedNotifications, n);
      this.updateNotificationInArray(this.unresolvedNotifications, n);
    }

    this.applyFilters();
  }

  private updateNotificationInArray(
    array: Notification[],
    newNotification: Notification,
  ): void {
    const existing = array.find((e) => e.id === newNotification.id);
    if (existing) {
      newNotification.messages =
        existing.messages || newNotification.messages || [];
      newNotification.participants =
        existing.participants || newNotification.participants || [];
      if (typeof newNotification.unread !== "number") {
        newNotification.unread = existing.unread || 0;
      }
      if (!newNotification.lastMessage)
        newNotification.lastMessage = existing.lastMessage;
      if (!newNotification.time) newNotification.time = existing.time;

      Object.assign(existing, newNotification);
    } else {
      newNotification.messages = newNotification.messages || [];
      newNotification.participants = newNotification.participants || [];
      array.unshift(newNotification);
    }
  }

  loadQuestion(websiteId?: string): void {
    const id = websiteId;

    if (!id) {
      console.warn("No websiteId available to load questions.");
      this.questions = [];
      return;
    }

    this.websiteService.getQuestionWithWebsiteId(id).subscribe({
      next: (res: any) => {
        this.questions = res;
      },
      error: (err: any) => {
        console.warn("Failed to load questions for websiteId:", id, err);
        this.questions = [];
      },
    });
  }

  filterQuestion() {
    const term = (this.questionSearchTerm || "").toString().trim();
    if (!term) {
      this.filteredQuestions = Array.isArray(this.questions)
        ? this.questions.slice(0, 6)
        : [];
      this.selectedQuestion = null;
      return;
    }

    const lower = term.toLowerCase();
    this.filteredQuestions = (this.questions || []).filter((panel: any) =>
      String(panel.messageText || "")
        .toLowerCase()
        .includes(lower),
    );

    const exact = (this.questions || []).find(
      (q: any) => String(q.messageText || "").toLowerCase() === lower,
    );

    if (exact) {
      this.selectedQuestion = exact;
      this.showQuestionDropDown = false;
    } else {
      this.selectedQuestion = null;
    }
  }

  selectQuestion(q: any) {
    if (!q) return;
    this.selectedQuestion = q;
    this.questionSearchTerm = q.messageText || "";
    this.showQuestionDropDown = false;
  }

   selectQuestionTwo(q: any) {
    if (!q) return;
    this.selectedQuestionTwo = q;
    this.questionSearchTerm = q.messageText || "";
    this.showQuestionDropDownTwo = false;
  }

  onQuestionEnter(event: any) {
    event?.preventDefault?.();
    if (this.selectedQuestion ||  this.selectedQuestionTwo) {
      this.sendMessage();
    } else {
      try {
        this.snackBar.show(
          "Please choose a question from the suggestions before sending.",
          false,
        );
      } catch {}
    }
  }

  canSend(): boolean {
    return !!this.selectedNotification && !!this.selectedQuestion;
  }

  private resolvePaletteKey(roleName: string | undefined | null): string {
    if (!roleName) return "branch";
    const key = String(this.role).toLowerCase();
    if (this.ROLE_PALETTE[key]) return key;
    const tokens = key.split(/[_\-\s]+/);
    for (const t of tokens) {
      if (this.ROLE_PALETTE[t]) return t;
    }
    return "branch";
  }
  getPalette(roleName: string | undefined | null) {
    const key = this.resolvePaletteKey(this.role.toLowerCase());
    return this.ROLE_PALETTE[key] || this.ROLE_PALETTE["branch"];
  }
  private hexToRgba(hex: string, alpha = 1) {
    const h = hex.replace("#", "");
    const full =
      h.length === 3
        ? h
            .split("")
            .map((c) => c + c)
            .join("")
        : h;
    const bigint = parseInt(full, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  getAvatarStyle(roleName: string | undefined | null) {
    const p = this.getPalette(roleName);
    const gradient = `linear-gradient(135deg, ${p.primary}, ${p.secondary})`;
    const boxShadow = `0 6px 18px -6px ${p.glow}`;
    return {
      background: gradient,
      color: p.font,
      "box-shadow": boxShadow,
      border: `2px solid ${p.border}`,
    } as { [key: string]: string };
  }
  getBubbleStyle(roleName: string | undefined | null, isCurrentUser = false) {
    const p = this.getPalette(roleName);
    if (isCurrentUser) {
      const gradient = `linear-gradient(135deg, ${p.primary}, ${p.secondary})`;
      return {
        background: gradient,
        color: p.font,
        "box-shadow": `0 8px 30px -12px ${p.glow}`,
      } as { [key: string]: string };
    }
    return {
      background: p.bg,
      color: p.font === "#FFFFFF" ? "#111827" : p.font,
      border: `1px solid ${this.hexToRgba(p.border, 0.12)}`,
    } as { [key: string]: string };
  }

  private mapThreadToNotification(t: any): Notification {
    const rawName = t.queryMessage || t.title || t.fundsType || "Thread";

    const groupName =
      rawName.length > 14 ? rawName.slice(0, 14) + "..." : rawName;

    let threadType = "unknown";
    if (t.fundsType) {
      const type = t.fundsType.toLowerCase();
      if (type.includes("upi")) threadType = "upi";
      else if (type.includes("bank")) threadType = "bank";
      else if (type.includes("payout")) threadType = "payout";
    }

    let unreadFlag = 0;
    try {
      const members = Array.isArray(t.rejectionThreadMember)
        ? t.rejectionThreadMember
        : Array.isArray(t.threadMembers)
          ? t.threadMembers
          : [];

      const myEntry =
        members && this.currentUserId
          ? members.find(
              (m: any) =>
                m.entityId === this.currentUserId ||
                m.userId === this.currentUserId ||
                m.id === this.currentUserId,
            )
          : null;
      if (myEntry) {
        unreadFlag = myEntry.lastReadTime ? 0 : 1;
      } else {
        unreadFlag =
          typeof t.isRead === "boolean" ? (t.isRead ? 0 : 1) : t.unread || 0;
      }
    } catch (e) {
      unreadFlag =
        typeof t.isRead === "boolean" ? (t.isRead ? 0 : 1) : t.unread || 0;
    }

    return {
      id: t.id || t.threadId || t.fundsId,
      groupName: groupName,
      avatar: this.getInitials(groupName),
      lastMessage: t.lastMessage || t.message || "",
      lastSender: t.lastSender || t.createdByName || "",
      time: this.formatTime(t.updatedAt || t.createdAt || ""),
      unread: t.unreadCount || unreadFlag,
      participantCount: t.participantCount || 0,
      participants: [],
      messages: [],
      _raw: t,
      role: t.role || t.defaultRole || null,
      websiteId: t.websiteId,
      resolved: t.resolved,
      fundId: t.fundsId,
      fundType: t.fundsType,
      threadType: threadType,
      name: rawName,
    };
  }

  selectNotification(notification: Notification): void {
    if (!notification) return;

    if (
      this.selectedNotification &&
      this.selectedNotification.id === notification.id
    ) {
      const existingRef = this.notifications.find(
        (n) => n.id === notification.id,
      );
      if (existingRef) {
        this.selectedNotification = existingRef;
      }
      return;
    }

    if (this.realTimeSub) {
      try {
        this.realTimeSub.unsubscribe();
      } catch {}
      this.realTimeSub = null;
    }
    if (
      this.subscribedThreadId &&
      this.subscribedThreadId !== notification.id
    ) {
      try {
        (this.socketConfigService as any).unsubscribeMessagePage?.(
          this.subscribedThreadId,
        );
        (this.socketConfigService as any).unsubscribeMessages?.(
          this.subscribedThreadId,
        );
      } catch (e) {}
      this.subscribedThreadId = null;
    }

    this.selectedNotification = notification;
    notification.unread = 0;
    this.showParticipants = false;
    this.participantsMap.clear();

    this.currentPage = 0;
    this.noMoreMessages = false;
    this.loadingMessages = false;
    this.lastScrollTop = 0;

    const threadId = notification.id;
    this.loadMessages(threadId, 0);
    this.loadQuestion(notification.websiteId);

    this.subscribeToRealTimeMessages(threadId);
  }

  private loadChatMembers(threadId: any): void {
    this.notificationChatService.getChatMembersByThreadId(threadId).subscribe({
      next: (membersRes: any) => {
        const members = Array.isArray(membersRes)
          ? membersRes
          : membersRes
            ? [membersRes]
            : [];
        const mappedMembers: GroupParticipant[] = membersRes.map((m: any) => ({
          id: m.id,
          userId: m.userId,
          userName: m.memberName || "Unknown",
          avatar: this.getInitials(m.memberName || "U"),
          online: !!m.online,
          role: m.entityType || m.userRole || null,
        }));

        mappedMembers.forEach((member) => {
          this.participantsMap.set(member.userId, member);
        });

        this.zone.run(() => {
          if (
            this.selectedNotification &&
            this.selectedNotification.id === threadId
          ) {
            this.selectedNotification.participants = mappedMembers;
            this.selectedNotification.participantCount = mappedMembers.length;
          }
        });
      },
      error: (err) => {
        this.snackBar.show("Failed to load members", false);
      },
    });
  }

  private loadMessages(threadId: string, page: number = 0): void {
    if (!threadId) return;
    if (this.loadingMessages) return;
    if (page > 0 && this.noMoreMessages) return;

    this.loadingMessages = true;

    this.notificationChatService
      .getMessageByThreadId(threadId, this.branchId, page, this.pageSize)
      .subscribe({
        next: (messagesRes: any) => {
          const msgs = Array.isArray(messagesRes)
            ? messagesRes
            : messagesRes
              ? [messagesRes]
              : [];
          if (msgs.length < this.pageSize) {
            this.noMoreMessages = true;
          }

          const mapped: GroupMessage[] = msgs.map((m: any) =>
            this.mapBackendMessageToGroupMessage(m),
          );

          this.zone.run(() => {
            if (
              !this.selectedNotification ||
              this.selectedNotification.id !== threadId
            ) {
              this.loadingMessages = false;
              return;
            }

            if (page === 0) {
              this.selectedNotification.messages = mapped || [];
              this.currentPage = 0;
              setTimeout(() => this.scrollChatToBottom(), 50);
            } else {
              try {
                const containerEl = this.messagesContainer.nativeElement;
                const previousScrollHeight = containerEl.scrollHeight;

                this.selectedNotification.messages = [
                  ...(mapped || []),
                  ...(this.selectedNotification.messages || []),
                ];

                setTimeout(() => {
                  const newScrollHeight = containerEl.scrollHeight;
                  containerEl.scrollTop =
                    newScrollHeight - previousScrollHeight;
                }, 30);
              } catch (err) {
                this.selectedNotification.messages = [
                  ...(mapped || []),
                  ...(this.selectedNotification.messages || []),
                ];
              }
              this.currentPage = page;
            }
          });

          this.loadingMessages = false;
        },
        error: (err) => {
          this.loadingMessages = false;
          this.snackBar.show("Failed to load messages", false);
        },
      });
  }

  onMessagesScroll(event: Event): void {
    if (!this.messagesContainer) return;
    const el = event.target as HTMLElement;
    const scrollTop = el.scrollTop;
    const scrollLeft = el.scrollLeft;

    if (scrollLeft && scrollLeft > 0) {
      this.lastScrollTop = scrollTop;
      return;
    }

    const isUpward = scrollTop < this.lastScrollTop;
    this.lastScrollTop = scrollTop;

    if (!isUpward) return;

    const TOP_THRESHOLD = 80;

    if (scrollTop <= TOP_THRESHOLD) {
      if (
        !this.loadingMessages &&
        !this.noMoreMessages &&
        this.selectedNotification
      ) {
        this.loadMessages(this.selectedNotification.id, this.currentPage + 1);
      }
    }
  }

  private subscribeToRealTimeMessages(threadId: string): void {
    if (!threadId) return;

    if (this.subscribedThreadId === threadId && this.realTimeSub) {
      return;
    }

    if (this.realTimeSub) {
      try {
        this.realTimeSub.unsubscribe();
      } catch {}
      this.realTimeSub = null;
    }
    if (this.subscribedThreadId) {
      try {
        (this.socketConfigService as any).unsubscribeMessagePage?.(
          this.subscribedThreadId,
        );
        (this.socketConfigService as any).unsubscribeMessages?.(
          this.subscribedThreadId,
        );
      } catch (e) {}
    }

    this.subscribedThreadId = threadId;

    try {
      (this.socketConfigService as any).subscribeMessagePage?.(threadId);
    } catch (e) {}

    this.realTimeSub = this.socketConfigService
      .getMessages()
      .subscribe((data: any) => {
        if (!data) return;

        const incomingThreadId = data.threadId || data.thread || threadId;
        if (incomingThreadId !== this.subscribedThreadId) return;

        const payload = data.messages ?? data;

        this.zone.run(() => {
          if (Array.isArray(payload)) {
            for (const msg of payload)
              this.handleRealTimeMessage(msg, incomingThreadId);
          } else {
            this.handleRealTimeMessage(payload, incomingThreadId);
          }
        });
      });
  }

  openFundPopup(): void {
    const notification = this.selectedNotification;
    if (!notification) {
      try {
        this.snackBar.show(
          "No conversation selected to fetch fund info.",
          false,
        );
      } catch {}
      return;
    }

    const threadId = notification.id;
    const fundId = notification.fundId;
    const fundType = notification.fundType;

    this.showFundPopup = true;
    this.loadingFund = true;
    this.fundData = null;

    this.fundService
      .getByThreadIdFundIdAndType(threadId, fundId, fundType)
      .subscribe({
        next: (res: any) => {
          this.fundData = Array.isArray(res) && res.length === 1 ? res[0] : res;
          this.loadingFund = false;
        },
        error: (err: any) => {
          this.loadingFund = false;
          try {
            this.snackBar.show("Failed to load fund information", false);
          } catch {}
          console.warn("Failed to load fund data:", err);
        },
      });
  }

  closeFundPopup(): void {
    this.showFundPopup = false;
    this.fundData = null;
    this.loadingFund = false;
  }

  private mapBackendMessageToGroupMessage(m: any): GroupMessage {
    const senderId = m.senderId;
    const participant = senderId ? this.participantsMap.get(senderId) : null;
    const senderName =
      participant?.userName ||
      (senderId === this.branchId
        ? "You"
        : m.senderDetails?.username || "Unknown");
    const fileUrl = m.fileUrl || m.mediaUrl || null;
    const type = this.determineMessageType(fileUrl, m);

    return {
      id: m.id,
      senderId: senderId,
      senderName: senderName,
      senderAvatar: this.getInitials(senderName),
      senderRole: participant?.role || m.role || m.senderRole || undefined,
      text: m.message || m.text || "",
      time: this.formatTime(m.createdAt || m.time || ""),
      type: type,
      mediaUrl: fileUrl,
      isCurrentUser: senderId === this.branchId,
    };
  }

  private handleRealTimeMessage(rtMsg: any, threadId: string): void {
    if (!rtMsg) return;

    const gm: GroupMessage = this.mapBackendMessageToGroupMessage(rtMsg);

    const existingIndex = this.notifications.findIndex(
      (n) => n.id === threadId || n._raw?.threadId === threadId,
    );

    const updateExisting = (existing: Notification) => {
      existing.lastMessage = gm.text;
      existing.lastSender = gm.senderName;
      existing.time = gm.time;

      if (
        this.selectedNotification &&
        this.selectedNotification.id === threadId
      ) {
        this.selectedNotification.messages = [
          ...(this.selectedNotification.messages || []),
          gm,
        ];
        if (existing.messages !== this.selectedNotification.messages) {
          existing.messages = this.selectedNotification.messages;
        }
        existing.unread = 0;
        setTimeout(() => this.scrollChatToBottom(), 50);
      } else {
        existing.unread = (existing.unread || 0) + 1;
      }
    };

    if (existingIndex > -1) {
      const existing = this.notifications[existingIndex];
      updateExisting(existing);

      const copy = [...this.notifications];
      copy.splice(existingIndex, 1);
      copy.unshift(existing);
      this.notifications = copy;

      const fi = this.filteredNotifications.findIndex(
        (n) => n.id === existing.id,
      );
      if (fi > -1) {
        const fcopy = [...this.filteredNotifications];
        fcopy.splice(fi, 1);
        fcopy.unshift(existing);
        this.filteredNotifications = fcopy;
      }
    } else {
      const findInAny = (arr: Notification[]) =>
        arr.find((n) => n.id === threadId || n._raw?.threadId === threadId);

      const foundInUI =
        findInAny(this.filteredNotifications) ||
        findInAny(this.allNotifications) ||
        findInAny(this.resolvedNotifications) ||
        findInAny(this.unresolvedNotifications) ||
        null;

      if (foundInUI) {
        updateExisting(foundInUI);

        const idx = this.filteredNotifications.findIndex(
          (n) => n.id === foundInUI.id,
        );
        if (idx > -1) {
          const copy = [...this.filteredNotifications];
          copy.splice(idx, 1);
          copy.unshift(foundInUI);
          this.filteredNotifications = copy;
        }
      } else {
        const stub: Notification = {
          id: threadId,
          groupName: gm.senderName || "Thread",
          avatar: this.getInitials(gm.senderName || "U"),
          lastMessage: gm.text,
          lastSender: gm.senderName,
          time: gm.time,
          unread: 1,
          participantCount: 0,
          participants: [],
          messages: [gm],
          _raw: {},
          role: null,
          websiteId: undefined,
          resolved: undefined,
          fundId: undefined,
          fundType: undefined,
          threadType: undefined,
        };

        this.notifications = [stub, ...this.notifications];
        this.filteredNotifications = [stub, ...this.filteredNotifications];

        if (
          this.selectedNotification &&
          this.selectedNotification.id === threadId
        ) {
          this.selectedNotification.messages = [
            ...(this.selectedNotification.messages || []),
            gm,
          ];
          stub.messages = this.selectedNotification.messages;
          stub.unread = 0;
          setTimeout(() => this.scrollChatToBottom(), 50);
        }
      }
    }
  }

  isHeadRole(): boolean {
    try {
      return (
        String(this.role || "")
          .toLowerCase()
          .includes("head") ||
        String(this.role || "")
          .toLowerCase()
          .includes("branch")
      );
    } catch {
      return false;
    }
  }

  sendSimpleMessage(event?: any): void {
    if (event) {
      event.preventDefault();
    }

    if (!this.selectedNotification) {
      try {
        this.snackBar.show("No conversation selected.", false);
      } catch {}
      return;
    }

    const text = (this.newMessage || "").toString().trim();
    if (!text) {
      try {
        this.snackBar.show("Please enter a message to send.", false);
      } catch {}
      return;
    }

    const threadId = this.selectedNotification.id;
    const payload = {
      senderId: this.branchId,
      message: text,
      fileUrl: null,
      senderType: this.role,
      roleId: this.branchId,
    };

    this.newMessage = "";

    try {
      this.socketConfigService.sendMessage(threadId, payload);
    } catch (e) {
      this.newMessage = text;
      try {
        this.snackBar.show("Failed to send message. Try again.", false);
      } catch {}
    }

    setTimeout(() => this.scrollChatToBottom(), 80);
  }

  sendMessage(): void {
    if (!this.selectedNotification) return;
    if (!this.selectedQuestion) {
      try {
        this.snackBar.show("Select a predefined question to send.", false);
      } catch {}
      return;
    }

    const textToSend = this.selectedQuestion.id;
    if (!textToSend) return;

    const threadId = this.selectedNotification.id;
    const payload = {
      senderId: this.branchId,
      message: textToSend,
      fileUrl: null,
      senderType: this.role,
      roleId: this.branchId,
    };

    this.selectedQuestion = null;
    this.questionSearchTerm = "";
    this.showQuestionDropDown = false;

    try {
      this.socketConfigService.sendMessage(threadId, payload);
    } catch (e) {}
  }

  triggerFileUpload(): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,video/*,audio/*,.pdf,.doc,.docx";

    input.onchange = (e: any) => {
      const file: File = e.target.files?.[0];
      if (!file || !this.selectedNotification) return;

      const threadId = this.selectedNotification.id;

      // 1️⃣ Temporary preview (optimistic UI)
      const tempUrl = URL.createObjectURL(file);

      const payload: any = {
        senderId: this.currentUserId,
        message: file.name,
        fileUrl: tempUrl,
        type: "FILE",
        status: "uploading",
      };

      // push to UI immediately (your chat list / message array)
      // this.messages.push(payload);
      setTimeout(() => this.scrollChatToBottom(), 0);

      // 2️⃣ Upload to backend
      this.notificationChatService.uploadAttachment(threadId, file).subscribe({
        next: (res) => {
          console.log(res);

          const fileId = res?.fileId;

          this.notificationChatService.getFileDownloadUrl(fileId).subscribe({
            next: (fileRes) => {
              console.log(fileRes);

              const actualFileUrl = fileRes?.downloadUrl;
              // 3️⃣ Update the message in UI with actual file URL
              payload.fileUrl = actualFileUrl;
              payload.status = "sent";
            },
            error: (err) => {
              console.error("Failed to get file URL", err);
              payload.status = "failed";
            },
          });

          payload.status = "sent";
          payload.fileId = fileId;

          payload.fileUrl = `/api/files/private/${fileId}`;
        },
        error: (err) => {
          console.error("Upload failed", err);
          payload.status = "failed";
        },
      });
    };

    input.click();
  }

  toggleParticipants(): void {
    if (!this.showParticipants) {
      const id = this.selectedNotification?.id;
      this.loadChatMembers(id);
    }
    this.showParticipants = !this.showParticipants;
  }

  openMediaViewer(
    mediaUrl: any,
    name: string = "",
    type: string = "file",
  ): void {
    this.currentMediaUrl = mediaUrl;
    this.currentMediaName = name || "";
    if (type === "image" || this.isImage(String(mediaUrl)))
      this.currentMediaType = "image";
    else if (type === "video" || this.isVideo(String(mediaUrl)))
      this.currentMediaType = "video";
    else if (type === "audio" || this.isAudio(String(mediaUrl)))
      this.currentMediaType = "audio";
    else this.currentMediaType = "file";
    this.showMediaViewer = true;
  }

  closeMediaViewer(): void {
    this.showMediaViewer = false;
    this.currentMediaUrl = "";
    this.currentMediaName = "";
    this.currentMediaType = "text";
  }

  async downloadFile(
    url: string | null | undefined,
    filename: string = "file",
  ) {
    if (!url) return this.snackBar.show("No file to download", false);
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Network response was not ok");
      const blob = await resp.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000 * 10);
    } catch (err) {
      try {
        window.open(url as string, "_blank");
      } catch (e) {
        this.snackBar.show("Unable to download file", false);
      }
    }
  }

  isImage(url: string | null | undefined) {
    return !!(url && String(url).match(/\.(jpg|jpeg|png|gif|webp|bmp|mp4|mp3)$/i));
  }
  isVideo(url: string | null | undefined) {
    return !!(url && String(url).match(/\.(mp4|webm|ogg|mov)$/i));
  }
  isAudio(url: string | null | undefined) {
    return !!(url && String(url).match(/\.(mp3|wav|ogg)$/i));
  }

  private scrollChatToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
        return;
      }
    } catch {}
    const fallback = document.querySelector(".overflow-y-auto");
    if (fallback) {
      fallback.scrollTop = fallback.scrollHeight;
    }
  }

  private determineMessageType(
    fileUrl: string | null,
    raw?: any,
  ): "text" | "image" | "video" | "audio" | "file" {
    if (raw && raw.type) {
      const t = String(raw.type).toLowerCase();
      if (["image", "video", "audio", "file", "text"].includes(t))
        return t as any;
    }
    if (!fileUrl) return "text";
    const s = String(fileUrl).toLowerCase();
    if (s.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/)) return "image";
    if (s.match(/\.(mp4|webm|ogg|mov)$/)) return "video";
    if (s.match(/\.(mp3|wav|ogg)$/)) return "audio";
    return "file";
  }

  private getInitials(name: string): string {
    if (!name) return "U";
    return name
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

   formatTime(timestamp: any): string {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  loadEmojis(): void {
    this.emojis =
      this.emojiCategories.find((c) => c.name === this.activeEmojiCategory)
        ?.emojis || [];
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
    if (this.showEmojiPicker) {
      this.loadEmojis();
    }
  }

  insertEmoji(emoji: string): void {
    const active = document.activeElement as HTMLInputElement | null;

    const insertIntoInput = (
      inputEl: HTMLInputElement,
      modelKey: "questionSearchTerm" | "newMessage",
    ) => {
      const start = inputEl.selectionStart ?? inputEl.value.length;
      const end = inputEl.selectionEnd ?? inputEl.value.length;
      const text = inputEl.value ?? "";
      const newText = text.substring(0, start) + emoji + text.substring(end);

      inputEl.value = newText;

      if (modelKey === "questionSearchTerm") {
        this.questionSearchTerm = newText;
        try {
          this.filterQuestion();
        } catch {}
      } else {
        this.newMessage = newText;
      }

      setTimeout(() => {
        try {
          inputEl.setSelectionRange(start + emoji.length, start + emoji.length);
          inputEl.focus();
        } catch (e) {}
      }, 0);
    };

    if (active && active.tagName === "INPUT") {
      const aria = (active.getAttribute("aria-label") || "").toLowerCase();
      if (aria.includes("search questions")) {
        insertIntoInput(active as HTMLInputElement, "questionSearchTerm");
        this.showEmojiPicker = false;
        return;
      }
      if (aria.includes("type message")) {
        insertIntoInput(active as HTMLInputElement, "newMessage");
        this.showEmojiPicker = false;
        return;
      }
    }

    const searchInput = document.querySelector(
      'input[aria-label="Search questions"]',
    ) as HTMLInputElement | null;
    if (searchInput) {
      insertIntoInput(searchInput, "questionSearchTerm");
      this.showEmojiPicker = false;
      return;
    }

    const msgInput = document.querySelector(
      'input[aria-label="Type message"]',
    ) as HTMLInputElement | null;
    if (msgInput) {
      insertIntoInput(msgInput, "newMessage");
      this.showEmojiPicker = false;
      return;
    }

    this.questionSearchTerm = (this.questionSearchTerm || "") + emoji;
    try {
      this.filterQuestion();
    } catch {}
    this.showEmojiPicker = false;
  }

  switchEmojiCategory(category: string): void {
    this.activeEmojiCategory = category;
    this.loadEmojis();
  }

  searchEmojis(): void {
    const searchTerm = this.emojiSearchTerm.toLowerCase();
    if (!searchTerm) {
      this.loadEmojis();
      return;
    }

    let allEmojis: string[] = [];
    this.emojiCategories.forEach((category) => {
      allEmojis = [...allEmojis, ...category.emojis];
    });

    this.emojis = allEmojis.filter(
      (emoji) =>
        emoji.includes(searchTerm) ||
        this.getEmojiDescription(emoji)?.includes(searchTerm),
    );
  }

  getEmojiDescription(emoji: string): string {
    const emojiMap: Record<string, string> = {
      "😀": "grinning face",
      "😂": "face with tears of joy",
      "❤️": "red heart",
      "👍": "thumbs up",
      "🔥": "fire",
      "⭐": "star",
      "🎉": "party popper",
      "💯": "hundred points",
    };

    return emojiMap[emoji] || "";
  }

  onSidebarWidthChange(width: number): void {
    this.sidebarWidth = width;
  }

  openUploadPopup(): void {
    if (!this.selectedNotification) {
      try {
        this.snackBar.show("Select a conversation first", false);
      } catch {}
      return;
    }
    this.showUploadPopup = true;
    this.selectedUploadFile = null;
    this.uploadingFile = false;
    this.uploadProgress = 0;
    this.uploadedFileId = null;
    this.uploadedFileUrl = null;
    this.uploadMessage = "";
    this.uploadError = null;
  }

  onUploadFileChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input?.files?.[0] || null;
    if (!file) return;
    this.selectedUploadFile = file;
    this.uploadError = null;

    // Optionally create a temporary preview for image files
    try {
      if (this.isImage(file.name)) {
        this.uploadedFileUrl = URL.createObjectURL(file); // preview until upload completes
      }
    } catch (e) {}
  }
  startUpload(): void {
    if (!this.selectedUploadFile || !this.selectedNotification) {
      try {
        this.snackBar.show("Choose a file and a conversation first", false);
      } catch {}
      return;
    }

    const threadId = this.selectedNotification.id;
    this.uploadingFile = true;
    this.uploadProgress = 0;
    this.uploadError = null;

    // uploadAttachment should return an observable with a fileId (adjust according to your API)
    this.notificationChatService
      .uploadAttachment(threadId, this.selectedUploadFile)
      .subscribe({
        next: (res: any) => {
          // Expecting { fileId: '...' } or similar. adapt based on actual response.
          const fileId =
            res?.fileId || res?.id || (typeof res === "string" ? res : null);
          if (fileId) {
            this.uploadedFileId = fileId;
            // As per your service, the private URL pattern is /api/files/private/{fileId}
            this.uploadedFileUrl = `${fileBaseUrl}/${fileId}`;
            this.sendUploadedFileMessage()
            console.log(this.uploadedFileUrl);
            
          } else if (res?.downloadUrl) {
            // if backend returns full url
            this.uploadedFileUrl = res.downloadUrl;
            console.log(this.uploadedFileUrl);
            
          }

          this.uploadingFile = false;
          this.uploadProgress = 100;
          try {
            this.snackBar.show("Upload successful", true);
          } catch {}
        },
        error: (err: any) => {
          this.uploadingFile = false;
          this.uploadError = "Upload failed";
          try {
            this.snackBar.show("Upload failed", false);
          } catch {}
          console.error("Upload error", err);
        },
      });
  }

  sendUploadedFileMessage(): void {

    // this.startUpload()

    if (!this.selectedNotification) return;
    if (!this.uploadedFileUrl) {
      try {
        this.snackBar.show("Please upload the file first", false);
      } catch {}
      return;
    }

    const threadId = this.selectedNotification.id;
    console.log(this.selectedQuestionTwo);
    
    const text = (this.selectedQuestionTwo?.id || "").toString().trim();

    const payload: any = {
      senderId: this.branchId,
      message: text,
      fileUrl: this.uploadedFileUrl,
      senderType: this.role,
      roleId: this.branchId,
      type: "FILE",
    };

    console.log(payload);
    

    try {
          this.socketConfigService.sendMessage(threadId, payload);

          //  this.closeUploadPopup();
    } catch (e) {
      try {
        this.snackBar.show("Failed to send message", false);
      } catch {}
    } finally {
        this.closeUploadPopup();
    }
  }

  closeUploadPopup(): void {
    this.showUploadPopup = false;
    try {
      if (
        this.uploadedFileUrl &&
        this.selectedUploadFile &&
        this.isImage(this.selectedUploadFile.name)
      ) {
        // revoke object URL created for preview
        try {
          URL.revokeObjectURL(this.uploadedFileUrl);
        } catch {}
      }
    } catch {}
    this.selectedUploadFile = null;
    this.uploadingFile = false;
    this.uploadProgress = 0;
    this.uploadedFileId = null;
    this.uploadedFileUrl = null;
    this.uploadMessage = "";
    this.uploadError = null;
  }

  toggleZoom() {
  this.isZoomed = !this.isZoomed;
  this.zoomLevel = this.isZoomed ? 2 : 1;
}

zoomIn() {
  this.zoomLevel = Math.min(this.zoomLevel + 0.25, 3);
  this.isZoomed = this.zoomLevel > 1;
}

zoomOut() {
  this.zoomLevel = Math.max(this.zoomLevel - 0.25, 0.5);
  this.isZoomed = this.zoomLevel > 1;
}

resetZoom() {
  this.zoomLevel = 1;
  this.isZoomed = false;
}

previousMedia() {
  if (this.currentMediaIndex > 0) {
    this.currentMediaIndex--;
    // this.loadMedia(this.mediaFiles[this.currentMediaIndex]);
  }
}

nextMedia() {
  if (this.currentMediaIndex < this.mediaFiles.length - 1) {
    this.currentMediaIndex++;
    // this.loadMedia(this.mediaFiles[this.currentMediaIndex]);
  }
}

onVideoLoaded(event: any) {
  this.videoDuration = event.target.duration;
}

// formatTime(seconds: number): string {
//   const mins = Math.floor(seconds / 60);
//   const secs = Math.floor(seconds % 60);
//   return `${mins}:${secs.toString().padStart(2, '0')}`;
// }

updateAudioTime() {
  this.audioCurrentTime = this.audioPlayer.nativeElement.currentTime;
}

updateAudioDuration() {
  this.audioDuration = this.audioPlayer.nativeElement.duration;
}

toggleAudioPlay() {
  if (this.isAudioPlaying) {
    this.audioPlayer.nativeElement.pause();
  } else {
    this.audioPlayer.nativeElement.play();
  }
  this.isAudioPlaying = !this.isAudioPlaying;
}

seekAudio(seconds: number) {
  this.audioPlayer.nativeElement.currentTime += seconds;
}

onAudioEnded() {
  this.isAudioPlaying = false;
  this.audioCurrentTime = 0;
}

copyFileLink() {
  navigator.clipboard.writeText(this.currentMediaUrl);
  this.showCopiedMessage = true;
  setTimeout(() => this.showCopiedMessage = false, 2000);
}

// Add ViewChild for audio player
@ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;
  
}
