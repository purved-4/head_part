
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
import { UserStateService } from "../../store/user-state.service";
import { SocketConfigService } from "../../pages/services/socket/socket-config.service";
import { PortalService } from "../../pages/services/portal.service";
import { FundsService } from "../../pages/services/funds.service";
import { ActivatedRoute } from "@angular/router";
import { emojiCategories } from "../../utils/constants";
import { fileBaseUrl } from "../../pages/services/helper";
import { ComPartService } from "../../pages/services/com-part.service";

interface GroupMessage {
  id: string;
  senderId: string | null;
  senderName: string;
  senderAvatar: string;
  senderRole?: string | null;
  text: string;
  time: string;
  rawTime?: string;
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
  portalId?: string;
  resolved?: boolean;
  fundId?: string;
  fundType?: string;
  threadType?: string;
  name?: string;
}

@Component({
  selector: "app-mobile-chatting",
  templateUrl: "./mobile-chatting.component.html",
  styleUrl: "./mobile-chatting.component.css",
})
export class MobileChattingComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild("messagesContainer") messagesContainer!: ElementRef<HTMLElement>;
  @ViewChild("threadsContainer") threadsContainer!: ElementRef<HTMLElement>;
  notifications: Notification[] = [];
  selectedNotification: Notification | null = null;
  newMessage = "";
  showParticipants = false;
  showFilters = false;

  showMediaViewer = false;
  currentMediaUrl = "";
  currentMediaName = "";
  currentMediaType: "image" | "video" | "audio" | "file" | "text" = "text";

  showEmojiPicker = false;
  emojis: string[] = [];
  activeEmojiCategory = "smileys";
  emojiSearchTerm = "";
  emojiCategories = emojiCategories;

  branchId: any;
  currentUserId: any;
  role: any;
  headId: any;

  selectedThread: any;

  // Modals
  showResendModal = false;
  showRejectModal = false;
  showPayoutModal = false;

  // Payout edit form
  payoutForm = {
    accountNumber: "",
    ifsc: "",
    reason: "",
  };

  isLoading = false;

  showThreadInfo = false;

  /* subscriptions */
  private realTimeSub: Subscription | null = null;
  private listSub: Subscription | null = null;
  private participantsMap: Map<string, GroupParticipant> = new Map();

  /* message pagination */
  pageSize = 15;
  currentPage = 0;
  loadingMessages = false;
  noMoreMessages = false;
  lastScrollTop = 0;

  /* questions */
  selectedQuestion: any = null;
  selectedQuestionTwo: any = null;
  questions: any[] = [];
  questionSearchTerm: any;
  filteredQuestions: any[] = [];
  showQuestionDropDown = false;
  showQuestionDropDownTwo = false;

  /* threads */
  portalId: any;
  loadingThreads = false;

  /* upload */
  showUploadPopup = false;
  selectedUploadFile: File | null = null;
  uploadingFile = false;
  uploadProgress = 0;
  uploadedFileId: string | null = null;
  uploadedFileUrl: string | null = null;
  uploadPreviewUrl: string | null = null;
  uploadMessage = "";
  uploadError: string | null = null;
  isDraggingFile = false;

  /* media viewer extras */
  isZoomed = false;
  zoomLevel = 1;
  showScrollTopBtn = false;
  showScrollBottomBtn = false;
  /* socket / sse */
  sse: any;
  subscribedThreadId: any;
  detailTabs: Array<"details" | "members" | "attachments"> = [
    "details",
    "members",
    "attachments",
  ];

  /* tabs & filters */
  activeTab: "rejected" | "pending" | "accepted" = "pending";
  allNotifications: Notification[] = [];
  resolvedNotifications: Notification[] = [];
  unresolvedNotifications: Notification[] = [];
  rejectedNotifications: Notification[] = [];
  fundTypeFilter: "all" | "upi" | "bank" | "payout" = "all";
  searchTerm = "";
  filteredNotifications: Notification[] = [];

  /* thread pagination */
  threadPage = 0;
  threadPageSize = 10;
  totalThreads = 0;
  totalThreadPages = 0;
  loadingMoreThreads = false;
  threadLastScrollTop = 0;
  hasMoreThreads = true;

  /* ── NEW: head / branch toggle ── */
  chatMode: "branch" | "head" = "branch";

  /* ── NEW: right sidebar detail tab ── */
  detailTab: "details" | "members" | "attachments" = "details";
  loadingMembers = false;

  /* ── NEW: sidebar collapsed state for mobile ── */
  showMobileSidebar = false;
  showRightPanel = false;

  JSON: any = JSON;
  paramThreadId: any;
  paramChatType: any;

  /* computed media gallery */
  get mediaGallery(): GroupMessage[] {
    if (!this.selectedNotification?.messages) return [];
    return this.selectedNotification.messages.filter(
      (m) =>
        m.type === "image" ||
        m.type === "video" ||
        m.type === "audio" ||
        m.type === "file",
    );
  }

  /* total unread count for badge */
  get totalUnread(): number {
    return this.filteredNotifications.reduce((s, n) => s + (n.unread || 0), 0);
  }

  constructor(
    private zone: NgZone,
    private notificationChatService: NotificationChatService,
    private snackBar: SnackbarService,
    private userStateService: UserStateService,
    private socketConfigService: SocketConfigService,
    private portalService: PortalService,
    private fundService: FundsService,
    private route: ActivatedRoute,
    private compartServices : ComPartService
  ) {}

  /* ════════════════════════════════════════════
     LIFECYCLE - FIXED (removed auto-selection)
     ════════════════════════════════════════════ */

  ngOnInit(): void {
    this.branchId = this.userStateService.getCurrentEntityId();
    this.currentUserId = this.userStateService.getUserId();
    this.role = this.userStateService.getRole();
    this.headId = this.userStateService.getCurrentEntityId();

    // default mode based on role
    this.chatMode = this.role === "HEAD" ? "head" : "branch";

    if (this.branchId) {
      this.loadThreads();
    }

    this.route.queryParams.subscribe((params) => {
      const threadId = params["threadId"];
      const chatType = (params["chatType"] || "").toString().toLowerCase();

      this.paramThreadId = threadId;
      this.paramChatType = chatType;

      if (chatType) {
        this.chatMode = chatType === "head" ? "head" : "branch";
      }

      // FIX: Only select thread if threadId is provided in URL
      if (threadId) {
        this.loadThreadForParams(threadId, chatType);
      }
      // REMOVED: The automatic selection of first thread
    });

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
      this.zone.run(() => this.updateUnreadCount(threadId, unreadCount));
    });

    this.sse = this.socketConfigService.getThreads().subscribe((data) => {
      if (!data) return;
      const threads = data.threads || [];
      this.mergeNotificationsFromThreads(threads);
      this.applyFilters();
      // REMOVED: handleThreadSelection() - don't auto-select
    });

    this.loadEmojis();
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
    if (!target.closest(".emoji-picker-container") && this.showEmojiPicker) {
      this.showEmojiPicker = false;
    }
    if (
      this.showQuestionDropDown &&
      !target.closest(".question-dropdown-container")
    ) {
      this.showQuestionDropDown = false;
    }
  }

  // FIX: Added method to close all overlays
  closeAllOverlays(): void {
    this.showEmojiPicker = false;
    this.showThreadInfo = false;
    this.showQuestionDropDown = false;
  }

  loadThreadForParams(threadId: string, chatType?: string): void {
    if (!threadId) return;

    if (chatType) {
      this.chatMode = chatType === "head" ? "head" : "branch";
    }

    this.notificationChatService.getThreadDetailsById(threadId).subscribe({
      next: (res: any) => {
        if (!res) {
          const existing = this.filteredNotifications.find(
            (n) => n.id === threadId,
          );
          if (existing) this.selectNotification(existing);
          return;
        }

        const mapped = this.mapThreadToNotification(res);

        this.updateNotificationInArray(this.allNotifications, mapped);
        this.updateNotificationInArray(this.resolvedNotifications, mapped);
        this.updateNotificationInArray(this.unresolvedNotifications, mapped);
        this.updateNotificationInArray(this.rejectedNotifications, mapped);

        this.applyFilters();

        const idx = this.filteredNotifications.findIndex(
          (n) => n.id === mapped.id,
        );
        if (idx > -1) {
          const copy = [...this.filteredNotifications];
          const item = copy.splice(idx, 1)[0];
          copy.unshift(item);
          this.filteredNotifications = copy;
        } else {
          this.filteredNotifications = [mapped, ...this.filteredNotifications];
        }

        this.selectNotification(mapped);
      },
      error: () => {
        const existing = this.filteredNotifications.find(
          (n) => n.id === threadId,
        );
        if (existing) {
          this.selectNotification(existing);
        } else {
          this.snackBar.show("Unable to load requested conversation", false);
        }
      },
    });
  }

  ngOnDestroy(): void {
    try {
      this.sse?.unsubscribe();
    } catch {}
    this.sse = undefined;
    try {
      this.realTimeSub?.unsubscribe();
    } catch {}
    this.realTimeSub = null;
    try {
      this.listSub?.unsubscribe();
    } catch {}
    this.listSub = null;

    if (this.subscribedThreadId) {
      try {
        (this.socketConfigService as any).unsubscribeMessagePage?.(
          this.subscribedThreadId,
        );
        (this.socketConfigService as any).unsubscribeMessages?.(
          this.subscribedThreadId,
        );
      } catch {}
      this.subscribedThreadId = null;
    }
  }

  isHeadRole(): boolean {
    const r = String(this.role || "").toLowerCase();
    return r.includes("head") || r.includes("branch");
  }

  isHeadOrBranchRole(): boolean {
    const r = String(this.role || "").toLowerCase();
    return r.includes("head") || r.includes("branch");
  }

  /* ════════════════════════════════════════════
     UI HELPERS
     ════════════════════════════════════════════ */

  getStatusBadgeClass(type: string): string {
    switch (type?.toLowerCase()) {
      case "upi":
        return "bg-purple-100 text-purple-700";
      case "bank":
        return "bg-blue-100 text-blue-700";
      case "payout":
        return "bg-emerald-100 text-emerald-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  }

  getStatusFromNotification(notification: Notification): string {
    if (notification.resolved === true) return "Resolved";
    if (notification.resolved === false) return "Pending";
    return "Pending";
  }

  getStatusDotClass(status: string): string {
    switch (status.toLowerCase()) {
      case "resolved":
        return "bg-emerald-400";
      case "rejected":
        return "bg-red-400";
      default:
        return "bg-amber-400";
    }
  }

  getStatusColorClass(status: string): string {
    switch (status.toLowerCase()) {
      case "resolved":
        return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
      case "rejected":
        return "bg-red-50 text-red-700 ring-1 ring-red-200";
      default:
        return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    }
  }

  getFormattedDateTime(timestamp: any): string {
    if (!timestamp) return "—";
    const date = new Date(timestamp);
    return (
      date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      " at " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  }

  getMessageDateSeparator(message: GroupMessage, index: number): string | null {
    if (!message.rawTime) return null;
    const msgDate = new Date(message.rawTime);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const msgDateStr = msgDate.toDateString();

    if (index > 0) {
      const prevMsg = this.selectedNotification?.messages?.[index - 1];
      if (prevMsg?.rawTime) {
        const prevDate = new Date(prevMsg.rawTime);
        if (prevDate.toDateString() === msgDateStr) return null;
      }
    }

    if (msgDateStr === today.toDateString()) return "Today";
    if (msgDateStr === yesterday.toDateString()) return "Yesterday";
    return msgDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  getAvatarColor(name: string): string {
    const colors = [
      "#6366f1",
      "#8b5cf6",
      "#ec4899",
      "#ef4444",
      "#f97316",
      "#eab308",
      "#22c55e",
      "#14b8a6",
      "#06b6d4",
      "#3b82f6",
    ];
    let hash = 0;
    for (let i = 0; i < (name || "").length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  getAvatarColorSecondary(name: string): string {
    const colors = [
      "#6366f1",
      "#8b5cf6",
      "#ec4899",
      "#ef4444",
      "#f97316",
      "#eab308",
      "#22c55e",
      "#14b8a6",
      "#06b6d4",
      "#3b82f6",
    ];
    let hash = 0;
    for (let i = 0; i < (name || "").length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  getRoleBadgeLabel(role: string | null | undefined): string {
    if (!role) return "";
    const r = role.toLowerCase();
    if (r.includes("head")) return "Head";
    if (r.includes("branch")) return "Branch";
    if (r.includes("admin")) return "Admin";
    if (r.includes("agent")) return "Agent";
    return role;
  }

  getFileExtension(url: string | null | undefined): string {
    if (!url) return "FILE";
    const parts = url.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "FILE";
  }

  getFileIcon(type: string): string {
    switch (type) {
      case "image":
        return "🖼️";
      case "video":
        return "🎬";
      case "audio":
        return "🎵";
      default:
        return "📄";
    }
  }

  toggleRightPanel(): void {
    this.showRightPanel = !this.showRightPanel;
  }

  /* ════════════════════════════════════════════
     THREAD LOADING & PAGINATION
     ════════════════════════════════════════════ */

  // onThreadsScroll(event: Event): void {
  //   if (
  //     !this.threadsContainer ||
  //     this.loadingMoreThreads ||
  //     !this.hasMoreThreads
  //   )
  //     return;
  //   const el = event.target as HTMLElement;
  //   if (el.scrollHeight - el.scrollTop - el.clientHeight <= 100) {
  //     this.loadMoreThreads();
  //   }
  //   this.threadLastScrollTop = el.scrollTop;
  // }

  onThreadsScroll(event: Event): void {
    if (!this.threadsContainer) return;

    const el = event.target as HTMLElement;

    //  SHOW / HIDE SCROLL BUTTON
    this.showScrollTopBtn = el.scrollTop > 200;

    //  LOAD MORE (keep your logic)
    if (!this.loadingMoreThreads && this.hasMoreThreads) {
      if (el.scrollHeight - el.scrollTop - el.clientHeight <= 100) {
        this.loadMoreThreads();
      }
    }

    this.threadLastScrollTop = el.scrollTop;
  }
  scrollToTop() {
    this.threadsContainer.nativeElement.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }
  loadMoreThreads(): void {
    if (this.loadingMoreThreads || !this.hasMoreThreads) return;
    this.loadingMoreThreads = true;
    this.threadPage++;
    this.loadResolvedThreadsPaginated();
  }

  loadThreads(): void {
    this.loadingThreads = true;
    this.threadPage = 0;
    this.totalThreads = 0;
    this.totalThreadPages = 0;
    this.hasMoreThreads = true;
    this.loadResolvedThreadsPaginated();
  }

  private loadResolvedThreadsPaginated(): void {
    if (this.role === "BRANCH") {
      this.notificationChatService
        .getThreadByBranchIdWithIsResolvedPaginated(
          this.branchId,
          this.role,
          this.activeTab,
          this.fundTypeFilter,
          this.threadPage,
          this.threadPageSize,
        )
        .subscribe({
          next: (res: any) =>
            this.processPaginatedThreadResponse(res, this.activeTab),
          error: () => this.onThreadLoadError(),
        });
    } else {
      this.notificationChatService
        .getAllThreadCombinedPaginate(
          this.headId,
          this.role,
          this.activeTab,
          this.fundTypeFilter,
        )
        .subscribe({
          next: (res: any) => {
            this.processPaginatedThreadResponse(res.content, this.activeTab);
          },
          error: () => this.onThreadLoadError(),
        });
    }
  }

  private onThreadLoadError(): void {
    this.loadingThreads = false;
    this.loadingMoreThreads = false;
    this.snackBar.show("Failed to load threads", false);
  }

  // FIX: processPaginatedThreadResponse - removed auto-selection
  private processPaginatedThreadResponse(res: any, tab: string): void {
    const threads = Array.isArray(res) ? res : Array.isArray(res) ? res : [];

    const mapped = threads.map((t: any) => this.mapThreadToNotification(t));

    this.totalThreads = res.total || res.totalElements || 0;
    this.totalThreadPages = Math.ceil(this.totalThreads / this.threadPageSize);
    this.hasMoreThreads = threads.length === this.threadPageSize;

    if (this.threadPage === 0) {
      if (tab === "all") this.allNotifications = mapped;
      else if (tab === "accepted") this.resolvedNotifications = mapped;
      else if (tab === "pending") this.unresolvedNotifications = mapped;
      else if (tab === "rejected") this.rejectedNotifications = mapped;
    } else {
      if (tab === "all")
        this.allNotifications = [...this.allNotifications, ...mapped];
      else if (tab === "accepted")
        this.resolvedNotifications = [...this.resolvedNotifications, ...mapped];
      else if (tab === "pending")
        this.unresolvedNotifications = [
          ...this.unresolvedNotifications,
          ...mapped,
        ];
      else if (tab === "rejected")
        this.rejectedNotifications = [...this.rejectedNotifications, ...mapped];
    }

    this.applyFilters();
    // REMOVED: this.handleThreadSelection(); - Don't auto-select

    this.loadingThreads = false;
    this.loadingMoreThreads = false;
  }

  /* ════════════════════════════════════════════
     FILTERS
     ════════════════════════════════════════════ */

  applyFilters(): void {
    let notifications: Notification[] = [];

    switch (this.activeTab) {
      case "accepted":
        notifications = [...this.resolvedNotifications];
        break;
      case "pending":
        notifications = [...this.unresolvedNotifications];
        break;
      case "rejected":
        notifications = [...this.rejectedNotifications];
        break;
    }

    if (this.fundTypeFilter !== "all") {
      notifications = notifications.filter(
        (n) => n.fundType?.toLowerCase() === this.fundTypeFilter,
      );
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      notifications = notifications.filter(
        (n) =>
          n.groupName.toLowerCase().includes(term) ||
          n.lastMessage.toLowerCase().includes(term) ||
          n.lastSender.toLowerCase().includes(term) ||
          (n.name || "").toLowerCase().includes(term),
      );
    }

    notifications.sort((a, b) => {
      if (a.unread !== b.unread) return b.unread - a.unread;
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

  /* ════════════════════════════════════════════
     UNREAD COUNT
     ════════════════════════════════════════════ */

  private updateUnreadCount(threadId: string, unreadCount: number): void {
    const updateArray = (arr: Notification[]) => {
      const n = arr.find((x) => x.id === threadId);
      if (!n) return;
      if (
        this.selectedNotification &&
        this.selectedNotification.id === threadId
      ) {
        n.unread = 0;
        this.selectedNotification.unread = 0;
      } else {
        n.unread = unreadCount;
      }
    };

    updateArray(this.allNotifications);
    updateArray(this.resolvedNotifications);
    updateArray(this.unresolvedNotifications);
    updateArray(this.rejectedNotifications);

    const fn = this.filteredNotifications.find((x) => x.id === threadId);
    if (fn) {
      fn.unread = this.selectedNotification?.id === threadId ? 0 : unreadCount;
    }

    this.applyFilters();
  }

  // FIX: REMOVED handleThreadSelection method entirely
  // private handleThreadSelection(): void { ... } // DELETED

  private mergeNotificationsFromThreads(threads: any[]): void {
    const mapped = (threads || []).map((t: any) =>
      this.mapThreadToNotification(t),
    );
    for (const n of mapped) {
      this.updateNotificationInArray(this.allNotifications, n);
      this.updateNotificationInArray(this.resolvedNotifications, n);
      this.updateNotificationInArray(this.unresolvedNotifications, n);
      this.updateNotificationInArray(this.rejectedNotifications, n);
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
      if (typeof newNotification.unread !== "number")
        newNotification.unread = existing.unread || 0;
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

  /* ════════════════════════════════════════════
     QUESTIONS (HEAD / BRANCH ONLY)
     ════════════════════════════════════════════ */

  // loadQuestion(): void {
  //   if (!this.isHeadOrBranchRole()) {
  //     this.questions = [];
  //     return;
  //   }
  //   // if (!portalId) {
  //   //   this.questions = [];
  //   //   return;
  //   // }
  //       this.compartServices.getAllQuestions().subscribe({

  //   // this.portalService.getQuestionWithPortalId(portafgelId).subscribe({
  //     next: (res: any) => {
  //       this.questions = res;
  //     },
  //     error: () => {
  //       this.questions = [];
  //     },
  //   });
  // }

  loadQuestion(): void {
  if (!this.isHeadOrBranchRole()) {
    this.questions = [];
    return;
  }

  this.compartServices.getAllQuestions().subscribe({
    next: (res: any) => {
      console.log("API Response:", res); // DEBUG

      this.questions = res?.content || [];   // ✅ FIX
      this.filteredQuestions = this.questions.slice(0, 6); // ✅ IMPORTANT

      console.log("Questions:", this.questions); // DEBUG
    },
    error: () => {
      this.questions = [];
      this.filteredQuestions = [];
    },
  });
}

  filterQuestion(): void {
    const term = (this.questionSearchTerm || "").toString().trim();
    if (!term) {
      this.filteredQuestions = Array.isArray(this.questions)
        ? this.questions.slice(0, 6)
        : [];
      this.selectedQuestion = null;
      return;
    }
    const lower = term.toLowerCase();
    this.filteredQuestions = (this.questions || []).filter((q: any) =>
      String(q.messageText || "")
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

  selectQuestion(q: any): void {
    if (!q) return;
    this.selectedQuestion = q;
    this.questionSearchTerm = q.messageText || "";
    this.showQuestionDropDown = false;
  }

  selectQuestionTwo(q: any): void {
    if (!q) return;
    this.selectedQuestionTwo = q;
    this.questionSearchTerm = q.messageText || "";
    this.showQuestionDropDownTwo = false;
  }

  onQuestionEnter(event: any): void {
    event?.preventDefault?.();
    if (this.selectedQuestion || this.selectedQuestionTwo) {
      this.sendMessage();
    } else {
      this.snackBar.show(
        "Please choose a question from the suggestions before sending.",
        false,
      );
    }
  }

  // FIX: Improved canSend method
  canSend(): boolean {
    if (!this.selectedNotification) return false;

    if (this.isHeadOrBranchRole()) {
      // For Head/Branch: either have selected question OR have file OR have text
      const hasQuestion = !!this.selectedQuestion;
      const hasFile = !!this.selectedUploadFile;
      const hasText = !!(this.newMessage || "").trim();

      // Can send if they have question OR (file with text) OR just file
      return hasQuestion || hasFile || hasText;
    }

    // For tp roles: either have text OR have file
    const hasText = !!(this.newMessage || "").trim();
    const hasFile = !!this.selectedUploadFile;

    return hasText || hasFile;
  }

  /* ════════════════════════════════════════════
     THREAD → NOTIFICATION MAPPING
     ════════════════════════════════════════════ */

  private mapThreadToNotification(t: any): Notification {
    const rawName = t.displayId || t.title || t.fundsType || "Thread";
    const groupName =
      rawName.length > 30 ? rawName.slice(0, 30) + "…" : rawName;

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
    } catch {
      unreadFlag =
        typeof t.isRead === "boolean" ? (t.isRead ? 0 : 1) : t.unread || 0;
    }

    return {
      id: t.id || t.threadId || t.fundsId,
      groupName,
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
      portalId: t.portalId,
      resolved: t.resolved,
      fundId: t.fundsId,
      fundType: t.fundsType,
      threadType,
      name: rawName,
    };
  }

  /* ════════════════════════════════════════════
     SELECT NOTIFICATION
     ════════════════════════════════════════════ */

  selectNotification(notification: Notification): void {
    if (!notification) return;
    if (
      this.selectedNotification &&
      this.selectedNotification.id === notification.id
    )
      return;

    // cleanup old subscription
    try {
      this.realTimeSub?.unsubscribe();
    } catch {}
    this.realTimeSub = null;

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
      } catch {}
      this.subscribedThreadId = null;
    }

    this.selectedNotification = notification;
    notification.unread = 0;
    this.showParticipants = false;
    this.participantsMap.clear();
    this.detailTab = "details";
    this.showRightPanel = false;

    this.currentPage = 0;
    this.noMoreMessages = false;
    this.loadingMessages = false;
    this.lastScrollTop = 0;

    const threadId = notification.id;
    this.loadMessages(threadId, 0);
    // this.loadChatMembers(threadId);

    if (this.isHeadOrBranchRole()) {
      this.loadQuestion();
    }

    this.subscribeToRealTimeMessages(threadId);
  }

  /* ════════════════════════════════════════════
     CHAT MEMBERS
     ════════════════════════════════════════════ */

  loadChatMembers(threadId: any): void {
    this.loadingMembers = true;
    this.notificationChatService.getChatMembersByThreadId(threadId).subscribe({
      next: (membersRes: any) => {
        const members = Array.isArray(membersRes)
          ? membersRes
          : membersRes
            ? [membersRes]
            : [];

        const mappedMembers: GroupParticipant[] = members.map((m: any) => ({
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
          this.loadingMembers = false;
        });
      },
      error: () => {
        this.loadingMembers = false;
      },
    });
  }

  onDetailTabChange(tab: "details" | "members" | "attachments") {
    this.detailTab = tab;

    if (tab === "members" && this.selectedNotification?.id) {
      this.loadChatMembers(this.selectedNotification.id);
    }
  }

  /* ════════════════════════════════════════════
     MESSAGE LOADING
     ════════════════════════════════════════════ */

  private loadMessages(threadId: string, page: number = 0): void {
    if (!threadId || this.loadingMessages) return;
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
          if (msgs.length < this.pageSize) this.noMoreMessages = true;

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
                  containerEl.scrollTop =
                    containerEl.scrollHeight - previousScrollHeight;
                }, 30);
              } catch {
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
        error: () => {
          this.loadingMessages = false;
          this.snackBar.show("Failed to load messages", false);
        },
      });
  }

  // onMessagesScroll(event: Event): void {
  //   if (!this.messagesContainer) return;
  //   const el = event.target as HTMLElement;
  //   const scrollTop = el.scrollTop;
  //   const isUpward = scrollTop < this.lastScrollTop;
  //   this.lastScrollTop = scrollTop;
  //   if (!isUpward) return;
  //   if (
  //     scrollTop <= 80 &&
  //     !this.loadingMessages &&
  //     !this.noMoreMessages &&
  //     this.selectedNotification
  //   ) {
  //     this.loadMessages(this.selectedNotification.id, this.currentPage + 1);
  //   }
  // }
  onMessagesScroll(event: Event): void {
    if (!this.messagesContainer) return;

    const el = event.target as HTMLElement;

    //  SHOW / HIDE SCROLL TO BOTTOM BUTTON
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;

    this.showScrollBottomBtn = !isNearBottom;

    //  KEEP YOUR OLD PAGINATION LOGIC
    const isUpward = el.scrollTop < this.lastScrollTop;
    this.lastScrollTop = el.scrollTop;

    if (
      isUpward &&
      el.scrollTop <= 80 &&
      !this.loadingMessages &&
      !this.noMoreMessages &&
      this.selectedNotification
    ) {
      this.loadMessages(this.selectedNotification.id, this.currentPage + 1);
    }
  }

  scrollToBottom(): void {
    if (this.messagesContainer) {
      this.messagesContainer.nativeElement.scrollTo({
        top: this.messagesContainer.nativeElement.scrollHeight,
        behavior: "smooth",
      });
    }
  }

  /* ════════════════════════════════════════════
     REAL-TIME MESSAGES
     ════════════════════════════════════════════ */

  private subscribeToRealTimeMessages(threadId: string): void {
    if (!threadId) return;
    if (this.subscribedThreadId === threadId && this.realTimeSub) return;

    try {
      this.realTimeSub?.unsubscribe();
    } catch {}
    this.realTimeSub = null;

    if (this.subscribedThreadId) {
      try {
        (this.socketConfigService as any).unsubscribeMessagePage?.(
          this.subscribedThreadId,
        );
        (this.socketConfigService as any).unsubscribeMessages?.(
          this.subscribedThreadId,
        );
      } catch {}
    }

    this.subscribedThreadId = threadId;
    try {
      (this.socketConfigService as any).subscribeMessagePage?.(threadId);
    } catch {}

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
      senderId,
      senderName,
      senderAvatar: this.getInitials(senderName),
      senderRole: participant?.role || m.role || m.senderRole || undefined,
      text: m.message || m.text || "",
      time: this.formatTime(m.createdAt || m.time || ""),
      rawTime: m.createdAt || m.time || "",
      type,
      mediaUrl: fileUrl,
      isCurrentUser: senderId === this.branchId,
    };
  }

  private handleRealTimeMessage(rtMsg: any, threadId: string): void {
    if (!rtMsg) return;
    const gm = this.mapBackendMessageToGroupMessage(rtMsg);

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
        if (existing.messages !== this.selectedNotification.messages)
          existing.messages = this.selectedNotification.messages;
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
        findInAny(this.rejectedNotifications) ||
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
        };
        this.notifications = [stub, ...this.notifications];
        this.filteredNotifications = [stub, ...this.filteredNotifications];

        if (this.selectedNotification?.id === threadId) {
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

  sendSimpleMessage(event?: any): void {
    if (event) event.preventDefault();
    if (!this.selectedNotification) {
      this.snackBar.show("No conversation selected.", false);
      return;
    }

    const text = (this.newMessage || "").toString().trim();
    const hasFile = !!this.selectedUploadFile;

    if (!text && !hasFile) {
      this.snackBar.show("Please enter a message or attach a file.", false);
      return;
    }

    const threadId = this.selectedNotification.id;

    if (hasFile) {
      this.uploadingFile = true;
      this.uploadProgress = 0;
      this.uploadError = null;

      this.notificationChatService
        .uploadAttachment(threadId, this.selectedUploadFile!)
        .subscribe({
          next: (res: any) => {
            const fileId =
              res?.fileId || res?.id || (typeof res === "string" ? res : null);
            let fileUrl: string | null = null;

            if (fileId) {
              fileUrl = `${fileBaseUrl}/${fileId}`;
            } else if (res?.downloadUrl) {
              fileUrl = res.downloadUrl;
            }

            if (!fileUrl) {
              this.uploadingFile = false;
              this.uploadError = "Upload succeeded but no file URL returned.";
              this.snackBar.show("Upload error: no file URL", false);
              return;
            }

            const payload: any = {
              senderId: this.branchId,
              message: text,
              fileUrl: fileUrl,
              senderType: this.role,
              roleId: this.branchId,
              type: "FILE",
            };

            try {
              this.socketConfigService.sendMessage(threadId, payload);
              this.snackBar.show("File sent successfully", true);
            } catch {
              this.snackBar.show("Failed to send message. Try again.", false);
            }

            this.newMessage = "";
            this.uploadingFile = false;
            this.uploadProgress = 100;
            this.removeInlineFile();
            setTimeout(() => this.scrollChatToBottom(), 80);
          },
          error: () => {
            this.uploadingFile = false;
            this.uploadError = "Upload failed. Please try again.";
            this.snackBar.show("Upload failed", false);
          },
        });
    } else {
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
      } catch {
        this.newMessage = text;
        this.snackBar.show("Failed to send message. Try again.", false);
      }
      setTimeout(() => this.scrollChatToBottom(), 80);
    }
  }

  // FIX: Improved sendMessage method
  // sendMessage(event?: any): void {
  //   if (event) {
  //     event.preventDefault();
  //     event.stopPropagation();
  //   }

  //   if (!this.selectedNotification) {
  //     this.snackBar.show("No conversation selected", false);
  //     return;
  //   }

  //   const text = (this.newMessage || "").toString().trim();
  //   const hasFile = !!this.selectedUploadFile;

  //   // Role-based validation
  //   if (this.isHeadOrBranchRole()) {
  //     // Head/Branch must have either question OR file
  //     if (!this.selectedQuestion && !hasFile && !text) {
  //       this.snackBar.show("Please select a question or attach a file", false);
  //       return;
  //     }
  //   } else {
  //     // Commerce Partner roles must have either text OR file
  //     if (!text && !hasFile) {
  //       this.snackBar.show("Please enter a message or attach a file", false);
  //       return;
  //     }
  //   }

  //   const threadId = this.selectedNotification.id;

  //   if (hasFile) {
  //     this.uploadAndSend(threadId, text);
  //   } else {
  //     this.sendTextMessage(threadId, text);
  //   }
  // }

  sendMessage(event?: any): void {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (!this.selectedNotification) {
    this.snackBar.show("No conversation selected", false);
    return;
  }

  if (!this.selectedQuestion) {
    this.snackBar.show("Please select a question", false);
    return;
  }

  const threadId = this.selectedNotification.id;

  const payload = {
    senderId: this.branchId,
    message: this.selectedQuestion.id, // ONLY QUESTION ID
    fileUrl: null,
    senderType: this.role,
    roleId: this.branchId,
  };

  try {
    this.socketConfigService.sendMessage(threadId, payload);

    // Reset after send
    this.selectedQuestion = null;
    this.questionSearchTerm = "";
    this.newMessage = "";

    this.showQuestionDropDown = false;

    setTimeout(() => this.scrollToBottom(), 80);
  } catch {
    this.snackBar.show("Failed to send message", false);
  }
}

  private uploadAndSend(threadId: string, text: string): void {
    this.uploadingFile = true;
    this.uploadProgress = 0;
    this.uploadError = null;

    this.notificationChatService
      .uploadAttachment(threadId, this.selectedUploadFile!)
      .subscribe({
        next: (res: any) => {
          const fileId =
            res?.fileId || res?.id || (typeof res === "string" ? res : null);
          let fileUrl = fileId ? `${fileBaseUrl}/${fileId}` : res?.downloadUrl;

          if (!fileUrl) {
            this.uploadingFile = false;
            this.uploadError = "Upload succeeded but no file URL returned";
            return;
          }

          let messageToSend = text;

          if (this.isHeadOrBranchRole() && this.selectedQuestion) {
            messageToSend =
              this.selectedQuestion.id || this.selectedQuestion.messageText;
          }

          const payload: any = {
            senderId: this.branchId,
            message: messageToSend,
            fileUrl,
            senderType: this.role,
            roleId: this.branchId,
            type: "FILE",
          };

          this.socketConfigService.sendMessage(threadId, payload);

          if (this.isHeadOrBranchRole()) {
            this.newMessage = "";
          } else {
            this.newMessage = "";
            this.selectedQuestion = null;
            this.questionSearchTerm = "";
          }

          this.uploadingFile = false;
          this.removeInlineFile();
          setTimeout(() => this.scrollToBottom(), 80);
        },
        error: (err) => {
          this.uploadingFile = false;
          this.uploadError = "Upload failed. Please try again.";
        },
      });
  }

  // // FIX: Improved scrollToBottom method
  // private scrollToBottom(): void {
  //   try {
  //     const el = this.messagesContainer?.nativeElement;
  //     if (el) {
  //       setTimeout(() => {
  //         el.scrollTop = el.scrollHeight;
  //       }, 100);
  //     }
  //   } catch (error) {

  //   }
  // }

  // FIX: Improved sendTextMessage method
  private sendTextMessage(threadId: string, text: string): void {
    let messageToSend = text;

    if (this.selectedQuestion) {
      messageToSend = this.selectedQuestion.id;
    }

    const payload = {
      senderId: this.branchId,
      message: messageToSend,
      fileUrl: null,
      senderType: this.role,
      roleId: this.branchId,
    };

    try {
      this.socketConfigService.sendMessage(threadId, payload);

      this.newMessage = "";

      // this.snackBar.show("Message sent", true);
      setTimeout(() => this.scrollToBottom(), 80);
    } catch (error) {
      this.snackBar.show("Failed to send message. Try again.", false);
    }
  }

  /* ════════════════════════════════════════════
     MEDIA VIEWER
     ════════════════════════════════════════════ */

  // openMediaViewer(
  //   mediaUrl: any,
  //   name: string = "",
  //   type: string = "file",
  // ): void {
  //   if (!mediaUrl) {
  //     this.snackBar.show("No media to preview", false);
  //     return;
  //   }
  //   this.currentMediaUrl = mediaUrl;
  //   this.currentMediaName = name || "";

  //   if (type === "image" || this.isImage(String(mediaUrl))) {
  //     this.currentMediaType = "image";
  //   } else if (type === "video" || this.isVideo(String(mediaUrl))) {
  //     this.currentMediaType = "video";
  //   } else if (type === "audio" || this.isAudio(String(mediaUrl))) {
  //     this.currentMediaType = "audio";
  //   } else {
  //     this.currentMediaType = "file";
  //   }

  //   this.isZoomed = false;
  //   this.zoomLevel = 1;
  //   this.showMediaViewer = true;
  // }
  openMediaViewer(
    mediaUrl: any,
    name: string = "",
    type: string = "file",
  ): void {
    if (!mediaUrl) {
      this.snackBar.show("No media to preview", false);
      return;
    }

    this.currentMediaUrl = mediaUrl;
    this.currentMediaName = name || "";
    this.currentMediaType = "file"; // default

    //  TRY TO DETECT IMAGE EVEN WITHOUT EXTENSION
    this.isImageByContent(mediaUrl).then((isImg) => {
      if (isImg) {
        this.currentMediaType = "image";
      } else if (type === "video") {
        this.currentMediaType = "video";
      } else if (type === "audio") {
        this.currentMediaType = "audio";
      } else {
        this.currentMediaType = "file";
      }
    });

    this.isZoomed = false;
    this.zoomLevel = 1;
    this.showMediaViewer = true;
  }

  closeMediaViewer(): void {
    this.showMediaViewer = false;
    this.currentMediaUrl = "";
    this.currentMediaName = "";
    this.currentMediaType = "text";
    this.isZoomed = false;
    this.zoomLevel = 1;
  }

  toggleZoom(): void {
    this.isZoomed = !this.isZoomed;
    this.zoomLevel = this.isZoomed ? 2 : 1;
  }

  async downloadFile(
    url: string | null | undefined,
    filename: string = "file",
  ): Promise<void> {
    if (!url) {
      this.snackBar.show("No file to download", false);
      return;
    }
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Network error");
      const blob = await resp.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 10000);
    } catch {
      try {
        window.open(url, "_blank");
      } catch {
        this.snackBar.show("Unable to download file", false);
      }
    }
  }

  isImage(url: string | null | undefined): boolean {
    return !!(url && String(url).match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i));
  }

  isVideo(url: string | null | undefined): boolean {
    return !!(url && String(url).match(/\.(mp4|webm|ogg|mov|avi)$/i));
  }

  isAudio(url: string | null | undefined): boolean {
    return !!(url && String(url).match(/\.(mp3|wav|ogg|aac|m4a)$/i));
  }

  private scrollChatToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
        return;
      }
    } catch {}
  }

  private determineMessageType(
    fileUrl: string | null,
    raw?: any,
  ): "text" | "image" | "video" | "audio" | "file" {
    if (raw?.type) {
      const t = String(raw.type).toLowerCase();
      if (["image", "video", "audio", "file", "text"].includes(t))
        return t as any;
    }
    if (!fileUrl) return "text";
    const s = String(fileUrl).toLowerCase();
    if (s.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/)) return "image";
    if (s.match(/\.(mp4|webm|ogg|mov|avi)$/)) return "video";
    if (s.match(/\.(mp3|wav|ogg|aac|m4a)$/)) return "audio";
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
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    });
  }

  /* ════════════════════════════════════════════
     EMOJI PICKER - FIXED
     ════════════════════════════════════════════ */

  loadEmojis(): void {
    this.emojis =
      this.emojiCategories.find((c) => c.name === this.activeEmojiCategory)
        ?.emojis || [];
  }

  // FIX: Improved toggleEmojiPicker
  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
    if (this.showEmojiPicker) {
      this.loadEmojis();
    }
  }

  // FIX: Added onMessageInput method
  onMessageInput(): void {
    // Auto-resize textarea if needed
    const textarea = document.querySelector(
      'textarea[data-model="message"]',
    ) as HTMLTextAreaElement;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 128) + "px";
    }
  }

  // FIX: Improved insertEmoji method
  insertEmoji(emoji: string): void {
    const messageInput = document.querySelector(
      'textarea[data-model="message"]',
    ) as HTMLTextAreaElement;

    if (messageInput && document.activeElement === messageInput) {
      const start = messageInput.selectionStart;
      const end = messageInput.selectionEnd;
      const text = messageInput.value;
      const newText = text.substring(0, start) + emoji + text.substring(end);

      this.newMessage = newText;

      setTimeout(() => {
        messageInput.focus();
        messageInput.setSelectionRange(
          start + emoji.length,
          start + emoji.length,
        );
      }, 0);
    } else {
      this.newMessage = (this.newMessage || "") + emoji;
    }

    this.showEmojiPicker = false;
  }

  switchEmojiCategory(category: string): void {
    this.activeEmojiCategory = category;
    this.loadEmojis();
  }

  /* ════════════════════════════════════════════
     FILE UPLOAD
     ════════════════════════════════════════════ */

  openUploadPopup(): void {
    if (!this.selectedNotification) {
      this.snackBar.show("Select a conversation first", false);
      return;
    }
    this.showUploadPopup = true;
    this.selectedUploadFile = null;
    this.uploadingFile = false;
    this.uploadProgress = 0;
    this.uploadedFileId = null;
    this.uploadedFileUrl = null;
    this.uploadPreviewUrl = null;
    this.uploadMessage = "";
    this.uploadError = null;
    this.isDraggingFile = false;
  }

  onUploadFileChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input?.files?.[0] || null;
    if (!file) return;
    this.selectedUploadFile = file;
    this.uploadError = null;
    this.setUploadPreview(file);
  }

  onUploadDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingFile = true;
  }

  onUploadDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingFile = false;
  }

  onUploadDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingFile = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectedUploadFile = files[0];
      this.uploadError = null;
      this.setUploadPreview(files[0]);
    }
  }

  private setUploadPreview(file: File): void {
    try {
      if (this.uploadPreviewUrl) URL.revokeObjectURL(this.uploadPreviewUrl);
      this.uploadPreviewUrl = null;
      if (this.isImage(file.name)) {
        this.uploadPreviewUrl = URL.createObjectURL(file);
      }
    } catch {}
  }

  startUpload(): void {
    if (!this.selectedUploadFile || !this.selectedNotification) {
      this.snackBar.show("Choose a file and a conversation first", false);
      return;
    }
    const threadId = this.selectedNotification.id;
    this.uploadingFile = true;
    this.uploadProgress = 0;
    this.uploadError = null;

    this.notificationChatService
      .uploadAttachment(threadId, this.selectedUploadFile)
      .subscribe({
        next: (res: any) => {
          const fileId =
            res?.fileId || res?.id || (typeof res === "string" ? res : null);
          if (fileId) {
            this.uploadedFileId = fileId;
            this.uploadedFileUrl = `${fileBaseUrl}/${fileId}`;
            this.sendUploadedFileMessage();
          } else if (res?.downloadUrl) {
            this.uploadedFileUrl = res.downloadUrl;
            this.sendUploadedFileMessage();
          }
          this.uploadingFile = false;
          this.uploadProgress = 100;
          this.snackBar.show("Upload successful", true);
        },
        error: () => {
          this.uploadingFile = false;
          this.uploadError = "Upload failed. Please try again.";
          this.snackBar.show("Upload failed", false);
        },
      });
  }

  sendUploadedFileMessage(): void {
    if (!this.selectedNotification || !this.uploadedFileUrl) return;
    const threadId = this.selectedNotification.id;
    let text = "";
    if (this.isHeadOrBranchRole()) {
      text = this.newMessage;
    } else {
      text = (this.selectedQuestionTwo?.id || "").toString().trim();
    }
    const payload: any = {
      senderId: this.branchId,
      message: text,
      fileUrl: this.uploadedFileUrl,
      senderType: this.role,
      roleId: this.branchId,
      type: "FILE",
    };
    try {
      this.socketConfigService.sendMessage(threadId, payload);
    } catch {
      this.snackBar.show("Failed to send message", false);
    }
    this.closeUploadPopup();
  }

  closeUploadPopup(): void {
    this.showUploadPopup = false;
    try {
      if (this.uploadPreviewUrl) URL.revokeObjectURL(this.uploadPreviewUrl);
    } catch {}
    this.selectedUploadFile = null;
    this.uploadingFile = false;
    this.uploadProgress = 0;
    this.uploadedFileId = null;
    this.uploadedFileUrl = null;
    this.uploadPreviewUrl = null;
    this.uploadMessage = "";
    this.uploadError = null;
    this.isDraggingFile = false;
  }

  removeSelectedFile(): void {
    try {
      if (this.uploadPreviewUrl) URL.revokeObjectURL(this.uploadPreviewUrl);
    } catch {}
    this.selectedUploadFile = null;
    this.uploadPreviewUrl = null;
    this.uploadError = null;
  }

  getTextClass(textType: any) {
    if (textType) {
      return "bg-indigo-600 text-white rounded-2xl rounded-br-sm px-5 py-1.5 shadow-lg shadow-indigo-500/20 min-w-[80px]";
    }

    return "bg-white text-gray-800 rounded-2xl rounded-bl-sm px-5 py-1.5 shadow-sm border border-gray-200/80 min-w-[80px]";
  }

  onInlineFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0] || null;
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      this.snackBar.show("File size exceeds 10MB limit", false);
      try {
        input.value = "";
      } catch {}
      return;
    }

    this.selectedUploadFile = file;
    this.uploadError = null;
    this.uploadedFileUrl = null;
    this.uploadedFileId = null;

    try {
      if (this.uploadPreviewUrl) URL.revokeObjectURL(this.uploadPreviewUrl);
      this.uploadPreviewUrl = null;
      if (this.isImage(file.name)) {
        this.uploadPreviewUrl = URL.createObjectURL(file);
      }
    } catch {}

    try {
      input.value = "";
    } catch {}
  }

  removeInlineFile(): void {
    try {
      if (this.uploadPreviewUrl) URL.revokeObjectURL(this.uploadPreviewUrl);
    } catch {}
    this.selectedUploadFile = null;
    this.uploadPreviewUrl = null;
    this.uploadedFileUrl = null;
    this.uploadedFileId = null;
    this.uploadError = null;
  }

  getShortFileName(name: string): string {
    if (!name) return "File";
    if (name.length <= 20) return name;
    const ext = name.lastIndexOf(".");
    if (ext > 0) {
      const extension = name.substring(ext);
      const baseName = name.substring(0, 14);
      return baseName + "…" + extension;
    }
    return name.substring(0, 18) + "…";
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  showPayoutModel(thread: any) {
    this.selectedThread = thread;

    if (this.selectedThread?.threadType === "payout") {
      this.getFundWithId(
        this.selectedThread.id,
        this.selectedThread.fundId,
        this.selectedThread.threadType,
      ).subscribe({
        next: (res: any) => {
          this.payoutForm.accountNumber = res.accountNo ?? "";
          this.payoutForm.ifsc = res.ifsc ?? "";
          this.payoutForm.reason = "";
          this.showPayoutModal = true;
          return;
        },
      });
    }
  }

  showResendConfirmation(thread: any): void {
    this.selectedThread = thread;
    this.showResendModal = true;
  }

  // confirmResend(): void {
  //   const confirmAction = confirm(
  //     "Are you sure you want to resend this thread?",
  //   );
  //   if (!confirmAction) return;

  //   this.isLoading = true;
  //   this.resendThread(this.selectedThread);
  //   this.closeModals();
  // }

  confirmResend() {
    if (!this.selectedThread) return;

    this.isLoading = true;

    this.fundService
      .acceptRejectThread(this.selectedThread.id, "ACCEPT")
      .subscribe({
        next: () => {
          this.snackBar.show("Thread resolved successfully", true);

          this.closeModals();

          //  RELOAD THREAD LIST
          this.loadThreads();

          this.isLoading = false;
        },
        error: () => {
          this.snackBar.show("Failed to resolve thread", false);
          this.isLoading = false;
        },
      });
  }

  private resendThread(thread: any): void {
    let call;

    switch (thread?.fundsType) {
      case "BANK":
      case "UPI":
        call = this.fundService.acceptRejectThread(thread.id, "RESEND");
        break;
      case "PAYOUT":
        call = null;
        break;
      default:
        call = this.fundService.acceptRejectThread(thread.id, "RESEND");
    }

    call?.subscribe({
      next: (res: any) => {
        this.isLoading = false;
      },
      error: (err: any) => {
        this.isLoading = false;
      },
    });
  }

  showRejectConfirmation(thread: any): void {
    this.selectedThread = thread;
    this.showRejectModal = true;
  }

  // confirmRejection(): void {
  //   const confirmAction = confirm(
  //     "Are you sure you want to reject this thread?",
  //   );
  //   if (!confirmAction) return;

  //   this.isLoading = true;
  //   this.performReject(this.selectedThread);
  //   this.closeModals();
  // }
  confirmReject() {
    if (!this.selectedThread || this.isLoading) return;

    this.isLoading = true;

    this.fundService
      .acceptRejectThread(this.selectedThread.id, "REJECT")
      .subscribe({
        next: () => {
          this.snackBar.show("Thread rejected successfully", true);

          this.closeModals();

          //  RELOAD THREAD LIST
          this.loadThreads();

          this.isLoading = false;
        },
        error: () => {
          this.snackBar.show("Failed to reject thread", false);
          this.isLoading = false;
        },
      });
  }

  private performReject(thread: any): void {
    let rejectCall;
    switch (thread?.fundsType) {
      case "BANK":
        rejectCall = this.rejectBankThread(thread.id);
        break;
      case "UPI":
        rejectCall = this.rejectUpiThread(thread.id);
        break;
      case "PAYOUT":
        rejectCall = this.rejectPayoutThread(thread.id);
        break;
      default:
        rejectCall = this.fundService.acceptRejectThread(thread.id, "REJECT");
    }

    rejectCall?.subscribe({
      next: (response: any) => {
        this.isLoading = false;
      },
      error: (error: any) => {
        this.isLoading = false;
      },
    });
  }

  sendEditedPayout(): void {
    if (!this.payoutForm.accountNumber.trim() || !this.payoutForm.ifsc.trim()) {
      alert("Please fill account number and IFSC.");
      return;
    }

    const payload = {
      accountNumber: this.payoutForm.accountNumber.trim(),
      ifsc: this.payoutForm.ifsc.trim(),
      reason: this.payoutForm.reason?.trim() || null,
    };

    this.isLoading = true;
    const threadId = this.selectedThread?.id;

    this.sentPayoutThreadUpdateToSameUser(threadId, payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.closeModals();
      },
      error: (err: any) => {
        this.isLoading = false;
      },
    });
  }

  // closeModals(): void {
  //   this.showResendModal = false;
  //   this.showRejectModal = false;
  //   this.showPayoutModal = false;
  //   this.selectedThread = null;
  //   this.resetPayoutForm();
  // }
  closeModals(): void {
    this.showResendModal = false;
    this.showRejectModal = false;
    this.showPayoutModal = false;
    this.selectedThread = null;
    this.resetPayoutForm();
  }

  private resetPayoutForm(): void {
    this.payoutForm = { accountNumber: "", ifsc: "", reason: "" };
  }

  rejectBankThread(threadId: any) {
    return this.fundService.acceptRejectThread(threadId, "REJECT");
  }

  rejectUpiThread(threadId: any) {
    return this.fundService.acceptRejectThread(threadId, "REJECT");
  }

  rejectPayoutThread(threadId: any) {
    return this.fundService.acceptRejectThread(threadId, "REJECT");
  }

  private sentPayoutThreadUpdateToSameUser(threadId: any, data: any) {
    return this.fundService.editpayoutRejectedFund(threadId, data);
  }

  private getFundWithId(threadId: any, fundId: any, fundType: any) {
    return this.fundService.getByThreadIdFundIdAndType(
      threadId,
      fundId,
      fundType,
    );
  }

  backToThreads(): void {
    this.selectedNotification = null;
    this.showThreadInfo = false;
  }

  toggleThreadInfo(): void {
    this.showThreadInfo = !this.showThreadInfo;
  }

  clearSelectedQuestion(): void {
    this.selectedQuestion = null;
    this.questionSearchTerm = "";
  }

  //   showResendConfirmation(notification: any) {
  //   this.selectedThread = notification;
  //   this.showResendModal = true;
  // }

  // showRejectConfirmation(notification: any) {
  //   this.selectedThread = notification;
  //   this.showRejectModal = true;
  // }

  // showPayoutModel(notification: any) {
  //   this.selectedThread = notification;
  //   this.showPayoutModal = true;
  // }

  // Add to your component class

  getFileIconMaterial(type: string): string {
    switch (type) {
      case "audio":
        return "audiotrack";
      case "video":
        return "videocam";
      case "file":
        return "insert_drive_file";
      default:
        return "attachment";
    }
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchTerm ||
      this.activeTab !== "pending" ||
      this.fundTypeFilter !== "all"
    );
  }

  clearAllFilters(): void {
    this.searchTerm = "";
    this.activeTab = "pending";
    this.fundTypeFilter = "all";
    this.applyFilters();
  }

  // Define filter arrays
  statusFilters = [
    { id: "pending", label: "Pending", icon: "schedule", color: "amber" },
    { id: "accepted", label: "Resolved", icon: "check_circle", color: "green" },
  ];

  typeFilters = [
    { id: "all", label: "All", icon: "apps", color: "gray" },
    { id: "upi", label: "UPI", icon: "payment", color: "violet" },
    { id: "bank", label: "Bank", icon: "account_balance", color: "violet" },
    { id: "payout", label: "Payout", icon: "payments", color: "violet" },
  ];

  getFilterButtonClass(isActive: boolean, color: string): string {
    if (isActive) {
      const colorMap: any = {
        amber: "bg-amber-50 text-amber-700",
        green: "bg-green-50 text-green-700",
        violet: "bg-violet-50 text-violet-700",
        gray: "bg-gray-100 text-gray-700",
      };
      return `${colorMap[color] || "bg-indigo-50 text-indigo-700"} rounded-lg`;
    }
    return "bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200";
  }

  isImageUrl(url: string | null | undefined): boolean {
    if (!url) return false;

    const lower = url.toLowerCase();

    return (
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".png") ||
      lower.endsWith(".gif") ||
      lower.endsWith(".webp") ||
      lower.endsWith(".bmp") ||
      lower.endsWith(".svg")
    );
  }

  isImageByContent(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }
}
