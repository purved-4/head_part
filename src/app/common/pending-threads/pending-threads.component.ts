import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from "@angular/core";
import { NotificationChatService } from "../../pages/services/notification-chat.service";
import { UserStateService } from "../../store/user-state.service";
import { Router } from "@angular/router";
import { SnackbarService } from "../snackbar/snackbar.service";
import { ComPartService } from "../../pages/services/com-part.service";

@Component({
  selector: "app-pending-threads",
  templateUrl: "./pending-threads.component.html",
  styleUrls: ["./pending-threads.component.css"],
})
export class PendingThreadsComponent implements OnInit, OnDestroy, OnChanges {
  @Input() entityId!: any;
  @Input() entityType: any;
  @Input() isOpen: boolean = false;

  @Output() close = new EventEmitter<void>();
  @Output() chatOpened = new EventEmitter<boolean>(); // Notify parent when chat opens

  threads: any[] = [];
  loading = false;
  page = 0;
  size = 20;
  hasMore = true;

  /* ── Chat Popup state ── */
  chatPopupOpen = false;
  selectedChatThread: any = null;

  /* ── Auto-refresh ── */
  private refreshInterval: any = null;
  private readonly REFRESH_INTERVAL_MS = 60_000;
  constructor(
    private notificationChatService: NotificationChatService,
    private userStateService: UserStateService,
    private router: Router,
    private snackBar: SnackbarService,
    private comPartService: ComPartService,
  ) {}

  ngOnInit(): void {
    this.entityId = this.userStateService.getCurrentEntityId();
    this.entityType = this.userStateService.getRole();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["isOpen"]) {
      if (this.isOpen) {
        this.getThreads(true);
        this.startAutoRefresh();
      } else {
        this.stopAutoRefresh();
      }
    }
  }
  /* ── AUTO REFRESH ── */

  // private startAutoRefresh(): void {
  //   this.stopAutoRefresh();
  //   this.refreshInterval = setInterval(() => {
  //     if (!this.chatPopupOpen && !this.chatPopupOpen) {
  //       this.getThreads(true);
  //     }
  //   }, this.REFRESH_INTERVAL_MS);
  // }
  private startAutoRefresh(): void {
    this.stopAutoRefresh();

    this.refreshInterval = setInterval(() => {
      if (this.isOpen && !this.chatPopupOpen) {
        this.getThreads(true);
      }
    }, this.REFRESH_INTERVAL_MS);
  }

  private stopAutoRefresh(): void {
    if (this.refreshInterval !== null) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /* ── THREAD LOADING ── */

  getThreads(reset: boolean = true): void {
    if (!this.entityId) return;

    if (reset) {
      this.page = 0;
      this.threads = [];
      this.hasMore = true;
    }

    this.loading = true;
    if (this.entityType == "COM_PART") {
      this.comPartService
        .getAllThreadCombinedPaginate(
          this.entityId,
          this.entityType,
          "pending",
          "all",
          this.page,
          10,
        )
        .subscribe({
          next: (res: any) => {
            const content = res?.content || [];
            this.threads = [...this.threads, ...content];
            if (content.length < 10) this.hasMore = false;
            this.loading = false;
          },
          error: (err) => {

            this.loading = false;
          },
        });
    } else {
      this.notificationChatService
        .getAllThreadCombinedPaginate(
          this.entityId,
          this.entityType,
          "pending",
          "all",
          this.page,
          10,
        )
        .subscribe({
          next: (res: any) => {
            const content = res?.content || [];
            this.threads = [...this.threads, ...content];
            if (content.length < 10) this.hasMore = false;
            this.loading = false;
          },
          error: (err) => {

            this.loading = false;
          },
        });
    }
  }

  loadMore(): void {
    this.page++;
    this.getThreads(false);
  }

  onClose(): void {
    this.stopAutoRefresh();
    this.close.emit();
  }

  trackByThread(index: number, item: any): any {
    return item.id || index;
  }

  /* ── NAVIGATION ── */

  /** Navigate to full chat page */
  openThread(thread: any): void {
    this.onClose();
    const c = this.entityType.toLowerCase();
    this.router.navigate([`/${c}/chat`], {
      queryParams: { threadId: thread?.id },
    });
  }

  /* ── CHAT POPUP ── */

  /** Open floating chat popup in side panel */
  openChatPopup(thread: any): void {
    const rawName =
      thread.queryMessage || thread.title || thread.fundsType || "Thread";

    this.selectedChatThread = {
      id: thread.id,
      groupName: rawName.length > 30 ? rawName.slice(0, 30) + "…" : rawName,
      name: rawName,
      displayId: thread.displayId,
      fundType: thread.fundsType,
      portalId: thread.portalId,
      resolved: thread.resolved,
    };

    this.chatPopupOpen = true;

    // close pending threads panel
    this.isOpen = false;

    // notify parent
    this.chatOpened.emit(true);
  }

  /** Close floating chat popup */
  closeChatPopup(): void {
    this.chatPopupOpen = false;
    this.selectedChatThread = null;
    // Notify parent that chat is closed
    this.chatOpened.emit(false);
    // Refresh immediately to catch any updates
    this.getThreads(true);
  }
}