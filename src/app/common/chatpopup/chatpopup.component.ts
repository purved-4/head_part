import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  NgZone,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from "@angular/core";
import { Subscription } from "rxjs";
import { SocketConfigService } from "../../pages/services/socket/socket-config.service";
import { NotificationChatService } from "../../pages/services/notification-chat.service";
import { UserStateService } from "../../store/user-state.service";
import { fileBaseUrl } from "../../pages/services/helper";
import { MultimediaService } from "../../pages/services/multimedia.service";
import { emojiCategories } from "../../utils/constants";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { SnackbarService } from "../snackbar/snackbar.service";
import { ComPartService } from "../../pages/services/com-part.service";
import { Router } from "@angular/router";

interface ChatMessage {
  id: string;
  senderId: string | null;
  senderName: string;
  text: string;
  time: string;
  rawTime?: string;
  type: "text" | "image" | "video" | "audio" | "file";
  mediaUrl?: string | null;
  isCurrentUser?: boolean;
  previewUrl?: string | null;
}

@Component({
  selector: "app-chatpopup",
  templateUrl: "./chatpopup.component.html",
  styleUrl: "./chatpopup.component.css",
})
export class ChatpopupComponent
  implements OnInit, OnDestroy, OnChanges, AfterViewChecked
{
  @Input() isOpen = false;
  @Input() thread: any = null;

  @Output() closePopup = new EventEmitter<void>();

  @ViewChild("messagesEnd") messagesEnd!: ElementRef;
  @ViewChild("messagesContainer") messagesContainer!: ElementRef;
  @ViewChild("fileInput") fileInput!: ElementRef;

  /* ── state ── */
  messages: ChatMessage[] = [];
  newMessage = "";
  isLoading = false;
  isSending = false;
  noMoreMessages = false;
  currentPage = 0;
  pageSize = 15;
  isLoadingMore = false;
  safeViewerUrl: SafeResourceUrl | null = null;

  /* ── user info ── */
  currentEntityId: any;
  currentRole: any;

  /* ── socket ── */
  private realTimeSub: Subscription | null = null;
  private subscribedThreadId: string | null = null;

  /* ── emoji ── */
  showEmojiPicker = false;
  emojiCategories = emojiCategories;
  activeEmojiCategory = "smileys";
  emojis: string[] = [];

  /* ── file upload ── */
  selectedFile: File | null = null;
  filePreviewUrl: string | null = null;
  isUploading = false;
  uploadError: string | null = null;

  /* ── image viewer ── */
  viewerUrl: string | null = null;
  viewerType: "image" | "video" | "audio" | "file" = "image";
  showViewer = false;

  private shouldScrollBottom = false;

  constructor(
    private zone: NgZone,
    private socketService: SocketConfigService,
    private chatService: NotificationChatService,
    private userState: UserStateService,
    private multimediaService: MultimediaService,
    private sanitizer: DomSanitizer,
    private snackBar: SnackbarService,
    private comPartService: ComPartService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.currentEntityId = this.userState.getCurrentEntityId();
    this.currentRole = this.userState.getRole();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["isOpen"]) {
      if (this.isOpen && this.thread) {
        this.initChat();
      } else if (!this.isOpen) {
        this.cleanupChat();
      }
    }
    if (changes["thread"] && this.isOpen && this.thread) {
      this.initChat();
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollBottom) {
      this.scrollToBottom();
      this.shouldScrollBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.cleanupChat();
  }

  /* ── CHAT INIT / CLEANUP ── */

  private initChat(): void {
    if (!this.thread?.id) return;
    this.messages = [];
    this.currentPage = 0;
    this.noMoreMessages = false;
    this.isLoading = true;
    this.loadMessages(0);
    this.subscribeSocket(this.thread.id);
  }

  private cleanupChat(): void {
    this.realTimeSub?.unsubscribe();
    this.realTimeSub = null;

    if (this.subscribedThreadId) {
      try {
        this.socketService.unsubscribeMessagePage(this.subscribedThreadId);
      } catch {}
      this.subscribedThreadId = null;
    }

    this.messages = [];
    this.newMessage = "";
    this.selectedFile = null;
    this.filePreviewUrl = null;
    this.showEmojiPicker = false;
    this.showViewer = false;
  }

  /* ── MESSAGES ── */
  private loadMessages(page: number): void {
    if (!this.thread?.id) return;
    if (page > 0 && this.noMoreMessages) return;

    if (page === 0) this.isLoading = true;
    else this.isLoadingMore = true;

    if (this.currentRole == "COM_PART") {
      this.comPartService
        .getMessageByThreadId(
          this.thread.id,
          this.currentEntityId,
          page,
          this.pageSize,
        )
        .subscribe({
          next: (msgs: any[]) => {
            const mapped = (msgs || [])
              .map((m) => this.mapMessage(m))
              .slice(-15);
            if (mapped.length < this.pageSize) this.noMoreMessages = true;

            this.zone.run(() => {
              if (page === 0) {
                this.messages = mapped;
                this.shouldScrollBottom = true;
              } else {
                this.messages = [...mapped, ...this.messages];
              }
              this.currentPage = page;
              this.isLoading = false;
              this.isLoadingMore = false;
            });
          },
          error: () => {
            this.isLoading = false;
            this.isLoadingMore = false;
          },
        });
    } else {
      this.chatService
        .getMessageByThreadId(
          this.thread.id,
          this.currentEntityId,
          page,
          this.pageSize,
        )
        .subscribe({
          next: (msgs: any[]) => {
            const mapped = (msgs || []).map((m) => this.mapMessage(m));
            if (mapped.length < this.pageSize) this.noMoreMessages = true;

            this.zone.run(() => {
              if (page === 0) {
                this.messages = mapped;
                this.shouldScrollBottom = true;
              } else {
                this.messages = [...mapped, ...this.messages];
              }
              this.currentPage = page;
              this.isLoading = false;
              this.isLoadingMore = false;
            });
          },
          error: () => {
            this.isLoading = false;
            this.isLoadingMore = false;
          },
        });
    }
  }

  private subscribeSocket(threadId: string): void {
    if (this.subscribedThreadId === threadId && this.realTimeSub) return;

    this.realTimeSub?.unsubscribe();
    if (this.subscribedThreadId) {
      try {
        this.socketService.unsubscribeMessagePage(this.subscribedThreadId);
      } catch {}
    }

    this.subscribedThreadId = threadId;
    try {
      this.socketService.subscribeMessagePage(threadId);
    } catch {}

    this.realTimeSub = this.socketService
      .getMessages()
      .subscribe((data: any) => {
        if (!data) return;

        const incomingThreadId =
          data.threadId || data.id || data?.message?.threadId || threadId;

        if (String(incomingThreadId) !== String(this.subscribedThreadId))
          return;

        const payload = data.messages || data.message || data.payload || data;

        this.zone.run(() => {
          if (Array.isArray(payload)) {
            payload.forEach((msg: any) => this.handleRealTimeMsg(msg));
          } else {
            this.handleRealTimeMsg(payload);
          }
        });
      });
  }

  private handleRealTimeMsg(raw: any): void {
    if (!raw) return;
    const mapped = this.mapMessage(raw);
    if (this.messages.some((m) => m.id === mapped.id)) return;
    this.messages = [...this.messages, mapped];
    this.shouldScrollBottom = true;
  }

  private mapMessage(m: any): ChatMessage {
    const senderId = m.senderId || m.senderEntityId || null;

    const senderName =
      senderId === this.currentEntityId
        ? "You"
        : m.senderDetails?.username ||
          m.senderName ||
          m.sender?.username ||
          "Unknown";

    const fileUrl = m.fileUrl || m.mediaUrl || null;
    const type = this.getType(fileUrl, m);

    const mappedMessage: ChatMessage = {
      id: m.id || crypto.randomUUID(),
      senderId,
      senderName,
      text: m.message || m.text || "",
      time: this.formatTime(m.updatedAt || m.createdAt || ""),
      rawTime: m.updatedAt || m.createdAt || "",
      type,
      mediaUrl: fileUrl,
      previewUrl: null,
      isCurrentUser: String(senderId) === String(this.currentEntityId),
    };

    if ((type === "image" || type === "video") && fileUrl) {
      this.multimediaService.getImageByUrlBlob(fileUrl).subscribe(
        (blob: Blob) => {
          const objectUrl = URL.createObjectURL(blob);
          mappedMessage.previewUrl = objectUrl;
        },
        () => {
          mappedMessage.previewUrl = fileUrl;
        },
      );
    }

    if ((type === "audio" || type === "file") && fileUrl) {
      this.multimediaService.getImageByUrlBlob(fileUrl).subscribe(
        (blob: Blob) => {
          const objectUrl = URL.createObjectURL(blob);
          mappedMessage.mediaUrl = objectUrl;
        },
        () => {
          mappedMessage.mediaUrl = fileUrl;
        },
      );
    }

    return mappedMessage;
  }

  /* ── SEND ── */

  send(): void {
    const text = (this.newMessage || "").trim();
    const hasFile = !!this.selectedFile;
    if (!text && !hasFile) return;
    if (!this.thread?.id) return;

    const threadId = this.thread.id;

    if (hasFile) {
      this.isUploading = true;
      this.uploadError = null;

      this.chatService
        .uploadAttachment(threadId, this.selectedFile!)
        .subscribe({
          next: (res: any) => {
            const fileId =
              res?.fileId || res?.id || (typeof res === "string" ? res : null);
            const fileUrl = fileId
              ? `${fileBaseUrl}/${fileId}`
              : res?.downloadUrl || null;

            if (!fileUrl) {
              this.isUploading = false;
              this.uploadError = "Upload failed";
              return;
            }

            const payload = {
              senderId: this.currentEntityId,
              senderEntityId: this.currentEntityId,
              roleId: this.currentEntityId,
              senderType: this.currentRole,
              message: text,
              fileUrl,
              type: "FILE",
            };

            try {
              this.socketService.sendMessage(threadId, payload);
            } catch {}

            this.newMessage = "";
            this.clearFile();
            this.isUploading = false;
          },
          error: (err: any) => {
            this.snackBar.show(
              err?.error?.message || "Upload failed. Try again.",
              false,
            );
            this.isUploading = false;
          },
        });
      return;
    }

    const payload = {
      senderId: this.currentEntityId,
      senderEntityId: this.currentEntityId,
      roleId: this.currentEntityId,
      senderType: this.currentRole,
      message: text,
      fileUrl: null,
    };

    try {
      this.socketService.sendMessage(threadId, payload);
      this.newMessage = "";
    } catch {}
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  /* ── FILE ── */

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      this.uploadError = "File size limit is 10MB";
      return;
    }
    this.selectedFile = file;
    this.uploadError = null;
    try {
      if (this.filePreviewUrl) URL.revokeObjectURL(this.filePreviewUrl);
      this.filePreviewUrl = this.isImage(file.name)
        ? URL.createObjectURL(file)
        : null;
    } catch {}
    try {
      input.value = "";
    } catch {}
  }

  clearFile(): void {
    try {
      if (this.filePreviewUrl) URL.revokeObjectURL(this.filePreviewUrl);
    } catch {}
    this.selectedFile = null;
    this.filePreviewUrl = null;
    this.uploadError = null;
  }

  /* ── EMOJI ── */

  toggleEmoji(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
    if (this.showEmojiPicker) this.loadEmojis();
  }

  loadEmojis(): void {
    this.emojis =
      this.emojiCategories.find((c: any) => c.name === this.activeEmojiCategory)
        ?.emojis || [];
  }

  switchEmojiCategory(cat: string): void {
    this.activeEmojiCategory = cat;
    this.loadEmojis();
  }

  insertEmoji(emoji: string): void {
    this.newMessage = (this.newMessage || "") + emoji;
    this.showEmojiPicker = false;
  }

  /* ── VIEWER ── */

  openViewer(url: string, type: "image" | "video" | "audio" | "file"): void {
    if (!url) return;

    this.viewerType = type;
    this.showViewer = true;

    try {
      if (this.viewerUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(this.viewerUrl);
      }
    } catch {}

    this.viewerUrl = null;
    this.safeViewerUrl = null;

    if (type === "image") {
      this.viewerUrl = url;
      return;
    }

    this.multimediaService.getImageByUrlBlob(url).subscribe({
      next: (blob: Blob) => {
        const objectUrl = URL.createObjectURL(blob);
        this.viewerUrl = objectUrl;
        this.safeViewerUrl =
          this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl);
      },
      error: () => {
        this.viewerUrl = url;
        this.safeViewerUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      },
    });
  }

  closeViewer(): void {
    try {
      if (this.viewerUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(this.viewerUrl);
      }
    } catch {}
    this.showViewer = false;
    this.viewerUrl = null;
    this.safeViewerUrl = null;
  }

  close(): void {
    this.closePopup.emit();
  }

  /* ── HELPERS ── */

  trackMessage(index: number, msg: ChatMessage): string {
    return msg.id || String(index);
  }

  private scrollToBottom(): void {
    try {
      this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: "smooth" });
    } catch {}
  }

  getInitials(name: string): string {
    if (!name) return "U";
    return name
      .split(" ")
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  getAvatarColor(name: string): string {
    const colors = [
      "#6366f1",
      "#8b5cf6",
      "#ec4899",
      "#ef4444",
      "#f97316",
      "#22c55e",
      "#06b6d4",
      "#3b82f6",
    ];
    let hash = 0;
    for (let i = 0; i < (name || "").length; i++)
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  formatTime(ts: any): string {
    if (!ts) return "";
    const date = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
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

  getType(
    fileUrl: string | null,
    raw?: any,
  ): "text" | "image" | "video" | "audio" | "file" {
    if (raw?.type) {
      const t = String(raw.type).toLowerCase();
      if (["image", "video", "audio", "file", "text"].includes(t))
        return t as any;
    }
    if (!fileUrl) return "text";
    if (this.isImage(fileUrl)) return "image";
    if (this.isVideo(fileUrl)) return "video";
    if (this.isAudio(fileUrl)) return "audio";
    return "file";
  }

  getShortFileName(name: string): string {
    if (!name) return "File";
    if (name.length <= 20) return name;
    const ext = name.lastIndexOf(".");
    if (ext > 0) return name.substring(0, 14) + "…" + name.substring(ext);
    return name.substring(0, 18) + "…";
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  getDateSeparator(msg: ChatMessage, index: number): string | null {
    if (!msg.rawTime) return null;
    const msgDate = new Date(msg.rawTime);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (index > 0) {
      const prev = this.messages[index - 1];
      if (
        prev?.rawTime &&
        new Date(prev.rawTime).toDateString() === msgDate.toDateString()
      )
        return null;
    }

    if (msgDate.toDateString() === today.toDateString()) return "Today";
    if (msgDate.toDateString() === yesterday.toDateString()) return "Yesterday";
    return msgDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  openFullChat(): void {
    if (!this.thread?.id) return;

    const role = String(this.currentRole || "").toLowerCase();

    if (role == "com_part") {
      const role = "comPart";

      this.close();
      this.router.navigate([`/${role}/chat`], {
        queryParams: {
          threadId: this.thread.id,
        },
      });
    } else {
      this.close();

      this.router.navigate([`/${role}/chat`], {
        queryParams: {
          threadId: this.thread.id,
        },
      });
    }
  }
}
