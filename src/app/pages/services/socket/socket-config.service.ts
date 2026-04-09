import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, filter, firstValueFrom } from "rxjs";
import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import baseUrl from "../helper";
import { AuthMemoryService } from "../auth-memory.service";
import { AuthService } from "../auth.service";
import { SubjectRegistryService } from "../../../registery/subject-registry.service";
import { SOCKET_BANK_KEY, SOCKET_LATEST_BALANCE_KEY, SOCKET_MESSAGE_PAGE_KEY, SOCKET_NEW_MESSAGE_KEY, SOCKET_NOTIFICATION_KEY, SOCKET_PENDING_DATA_KEY, SOCKET_THREADS_KEY, SOCKET_THREADS_USER_KEY, SOCKET_UPI_KEY } from "../../../registery/subject-registry.key";



@Injectable({
  providedIn: "root",
})
export class SocketConfigService {
  private stompClient!: Client | any;
  private connected = false;

  private pendingSubject!: BehaviorSubject<any>;
  public threads$!: BehaviorSubject<any>;
  public notification$!: BehaviorSubject<any>;
  public threadsUser$!: BehaviorSubject<any>;
  public messagePage$!: BehaviorSubject<any>;
  public newMessage$!: BehaviorSubject<any>;
  public latestBalance$!: BehaviorSubject<any>;
  private bank$!: BehaviorSubject<any>;
  private upi$!: BehaviorSubject<any>;

  private subscriptions = new Map<string, StompSubscription | null>();
  private pendingSubscribeTasks: (() => void)[] = [];

  private branchId?: string;

  private threadsEntityId?: string;
  private unreadThreadsEntityId?: string;
  private latestBalanceEntityId?: string;
  private notificationEntityId?: string;
  private refreshInFlight: Promise<string> | null = null;

  private reconnectInProgress = false;
  private activeTopics = new Map<
    string,
    { destination: string; handler: (msg: IMessage) => void }
  >();

  constructor(
    private memoryService: AuthMemoryService,
    private authService: AuthService,
    private subjectRegistry: SubjectRegistryService
  ) {
    this.pendingSubject = this.subjectRegistry.register(
      SOCKET_PENDING_DATA_KEY,
      () => new BehaviorSubject<any>(null),
      null
    );

    this.threads$ = this.subjectRegistry.register(
      SOCKET_THREADS_KEY,
      () => new BehaviorSubject<any>(null),
      null
    );

    this.notification$ = this.subjectRegistry.register(
      SOCKET_NOTIFICATION_KEY,
      () => new BehaviorSubject<any>(null),
      null
    );

    this.threadsUser$ = this.subjectRegistry.register(
      SOCKET_THREADS_USER_KEY,
      () => new BehaviorSubject<any>(null),
      null
    );

    this.messagePage$ = this.subjectRegistry.register(
      SOCKET_MESSAGE_PAGE_KEY,
      () => new BehaviorSubject<any>(null),
      null
    );

    this.newMessage$ = this.subjectRegistry.register(
      SOCKET_NEW_MESSAGE_KEY,
      () => new BehaviorSubject<any>(null),
      null
    );

    this.latestBalance$ = this.subjectRegistry.register(
      SOCKET_LATEST_BALANCE_KEY,
      () => new BehaviorSubject<any>(null),
      null
    );

    this.bank$ = this.subjectRegistry.register(
      SOCKET_BANK_KEY,
      () => new BehaviorSubject<any>(null),
      null
    );

    this.upi$ = this.subjectRegistry.register(
      SOCKET_UPI_KEY,
      () => new BehaviorSubject<any>(null),
      null
    );
  }

  private ensureConnected() {
    if (!this.stompClient?.active) {
      this.connect();
    }
  }

  connect(): void {
    if (this.stompClient?.active || this.reconnectInProgress) return;

    const httpUrl = baseUrl;
    const wsUrl = httpUrl.startsWith("https")
      ? httpUrl.replace(/^https/, "wss")
      : httpUrl.replace(/^http/, "ws");

    this.stompClient = new Client({
      brokerURL: `${wsUrl}/socket-process`,
      reconnectDelay: 0,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {},
    });

    this.stompClient.beforeConnect = async () => {
      const token = await this.getFreshAccessToken();
      this.stompClient!.connectHeaders = { token };
    };

    this.stompClient.onConnect = () => {
      this.connected = true;

      this.subscriptions.clear();
      for (const [key, item] of this.activeTopics.entries()) {
        const sub: StompSubscription = this.stompClient.subscribe(
          item.destination,
          (msg: IMessage) => {
            try {
              item.handler(msg);
            } catch {}
          }
        );
        this.subscriptions.set(key, sub);
      }

      while (this.pendingSubscribeTasks.length) {
        const task = this.pendingSubscribeTasks.shift();
        task && task();
      }
    };

    this.stompClient.onStompError = async (_frame: any) => {
      await this.handleAuthFailureAndReconnect();
    };

    this.stompClient.onWebSocketClose = () => {
      this.connected = false;
    };

    this.stompClient.activate();
  }

  private async getFreshAccessToken(forceRefresh = false): Promise<string> {
    const cached = this.memoryService.getAccessToken();

    if (cached && !forceRefresh) return cached;

    if (!this.refreshInFlight) {
      this.refreshInFlight = firstValueFrom(this.authService.refreshToken())
        .then((res: any) => {
          const token = res?.data?.token;
          if (!token) throw new Error("Refresh token failed");
          this.memoryService.setAccessToken(token);
          return token;
        })
        .finally(() => {
          this.refreshInFlight = null;
        });
    }

    return this.refreshInFlight;
  }

  private async handleAuthFailureAndReconnect(): Promise<void> {
    if (this.reconnectInProgress) return;
    this.reconnectInProgress = true;

    try {
      await this.disconnectOnly();
      this.memoryService.resetAccessToken();
      await this.getFreshAccessToken(true);

      this.reconnectInProgress = false;
      this.connect();
    } catch (e) {
      this.memoryService.resetAccessToken();
      this.disconnect();
    } finally {
      this.reconnectInProgress = false;
    }
  }

  private async disconnectOnly(): Promise<void> {
    if (this.stompClient?.active) {
      await this.stompClient.deactivate();
    }
    this.connected = false;
  }

  disconnect(): void {
    void this.disconnectOnly();

    this.subscriptions.forEach((s) => {
      try {
        s?.unsubscribe();
      } catch {}
    });

    this.subscriptions.clear();
    this.pendingSubscribeTasks = [];
    this.pendingSubject.next(null);
    this.threads$.next(null);
    this.threadsUser$.next(null);
    this.messagePage$.next(null);
    this.newMessage$.next(null);
  }

  private subscribeTopic(
    key: string,
    destination: string,
    handler: (msg: IMessage) => void
  ): void {
    this.activeTopics.set(key, { destination, handler });

    const doSubscribe = () => {
      const existing = this.subscriptions.get(key);
      if (existing) return;

      const sub: StompSubscription = this.stompClient.subscribe(
        destination,
        (msg: IMessage) => {
          try {
            handler(msg);
          } catch {}
        }
      );

      this.subscriptions.set(key, sub);
    };

    if (!this.connected || !this.stompClient?.active) {
      this.pendingSubscribeTasks.push(doSubscribe);
      this.ensureConnected();
    } else {
      doSubscribe();
    }
  }

  private unsubscribeTopic(key: string): void {
    if (!key) return;

    const sub = this.subscriptions.get(key);
    if (!sub) {
      this.subscriptions.delete(key);
      return;
    }

    try {
      sub.unsubscribe();
    } catch (e) {}

    this.subscriptions.delete(key);
  }

  subscribeToPendingData(branchId?: string) {
    if (branchId) this.branchId = branchId;
    if (!this.branchId) throw new Error("branchId required for pendingData topic");

    const key = `pendingData:${this.branchId}`;
    const dest = `/topic/pendingData/${this.branchId}`;

    this.subscribeTopic(key, dest, (msg) => {
      try {
        const data = JSON.parse(msg.body);
        this.pendingSubject.next(data);
      } catch (e) {}
    });
  }

  getPendingData(): Observable<any> {
    return this.pendingSubject.asObservable().pipe(filter((x) => x !== null));
  }

  unsubscribePendingData() {
    if (!this.branchId) return;
    this.unsubscribeTopic(`pendingData:${this.branchId}`);
  }

  subscribeThreads(entityId?: string) {
    if (entityId) this.threadsEntityId = entityId;
    const id = entityId ?? this.threadsEntityId;
    if (!id) throw new Error("entityId required for threads topic");

    const key = `threads:list:${id}`;
    const dest = `/topic/chat/threads/${id}`;

    this.subscribeTopic(key, dest, (msg) => {
      try {
        const data = JSON.parse(msg.body);
        this.threads$.next(data);
      } catch (e) {}
    });
  }

  getThreads(): Observable<any> {
    return this.threads$.asObservable().pipe(filter((x) => x !== null));
  }

  unsubscribeThreads(entityId?: string) {
    const id = entityId ?? this.threadsEntityId;
    if (!id) return;
    this.unsubscribeTopic(`threads:list:${id}`);
  }

  subscribeUnreadThreads(entityId?: string) {
    if (entityId) this.unreadThreadsEntityId = entityId;
    const id = entityId ?? this.unreadThreadsEntityId;
    if (!id) throw new Error("entityId required for unread threads");

    const key = `threads:reads:${id}`;
    const dest = `/topic/chat/threads/reads/${id}`;

    this.subscribeTopic(key, dest, (msg) => {
      try {
        const data = JSON.parse(msg.body);
        this.threadsUser$.next(data);
      } catch (e) {}
    });
  }

  getUnreadThreads(): Observable<any> {
    return this.threadsUser$.asObservable().pipe(filter((x) => x !== null));
  }

  unsubscribeUnreadThreads(entityId?: string) {
    const id = entityId ?? this.unreadThreadsEntityId;
    if (!id) return;
    this.unsubscribeTopic(`threads:reads:${id}`);
  }

  subscribeMessagePage(threadId: string) {
    const key = `messagePage:${threadId}`;
    const dest = `/topic/chat/thread/${threadId}/messages`;

    this.subscribeTopic(key, dest, (msg) => {
      try {
        const data = JSON.parse(msg.body);
        this.messagePage$.next(data);
      } catch (e) {}
    });
  }

  getMessages(): Observable<any> {
    return this.messagePage$.asObservable().pipe(filter((x) => x !== null));
  }

  unsubscribeMessagePage(threadId: string) {
    this.unsubscribeTopic(`messagePage:${threadId}`);
  }

  loadThreads(userId: string, type: string) {
    if (!this.stompClient || !this.stompClient.active) {
      this.pendingSubscribeTasks.push(() => this.loadThreads(userId, type));
      this.ensureConnected();
      return;
    }

    this.publishWithAuth("/app/user/threads", { userId, type });
  }

  loadMessagePage(threadId: string, page = 0, size = 15) {
    if (!this.stompClient || !this.stompClient.active) {
      this.pendingSubscribeTasks.push(() =>
        this.loadMessagePage(threadId, page, size)
      );
      this.ensureConnected();
      return;
    }

    this.publishWithAuth("/app/thread/messages", { threadId, page, size });
  }

  sendMessage(threadId: string, message: any) {
    if (!this.stompClient || !this.stompClient.active) {
      this.pendingSubscribeTasks.push(() =>
        this.sendMessage(threadId, message)
      );
      this.ensureConnected();
      return;
    }

    this.publishWithAuth("/app/thread/send", { threadId, message });
  }

  subscribeLatestBalance(entityType?: string, entityId?: string) {
    if (entityId) this.latestBalanceEntityId = entityId;
    const id = entityId ?? this.latestBalanceEntityId;
    const type = entityType?.toUpperCase() ?? "GENERIC";

    if (!id) throw new Error("entityId required for latest balance topic");

    const key = `latestBalance:${type}:${id}`;
    const dest = `/topic/entity/latest-balance/${type}/${id}`;

    this.subscribeTopic(key, dest, (msg) => {
      try {
        const data = JSON.parse(msg.body);
        this.latestBalance$.next(data);
      } catch (e) {}
    });
  }

  getLatestBalance(): Observable<any> {
    return this.latestBalance$.asObservable().pipe(filter((x) => x !== null));
  }

  unsubscribeLatestBalance(entityId?: string, entityType?: string) {
    const id = entityId ?? this.latestBalanceEntityId;
    if (!id) return;

    const type = entityType?.toUpperCase() ?? "GENERIC";
    this.unsubscribeTopic(`latestBalance:${type}:${id}`);
  }

  subscribeNotifications(entityId?: string | null) {
    if (entityId) this.notificationEntityId = entityId;
    const id = entityId ?? this.notificationEntityId;
    if (!id) return;

    const key = `notifications:${id}`;
    const dest = `/topic/notifications/${id}`;

    this.subscribeTopic(key, dest, (msg) => {
      try {
        const data = JSON.parse(msg.body);
        this.notification$.next(data);
      } catch (e) {}
    });
  }

  getNotifications(): Observable<any> {
    return this.notification$.asObservable().pipe(filter((x) => x !== null));
  }

  unsubscribeNotifications(entityId?: string) {
    const id = entityId ?? this.notificationEntityId;
    if (!id) return;
    this.unsubscribeTopic(`notifications:${id}`);
  }

  subscribeGetBankAndUpi(portalId: string, type: "bank" | "upi") {
    if (!portalId || !type) return;

    const key = `upibank:list:${portalId}:${type}`;
    const dest = `/topic/payments/${portalId}/${type}`;

    this.subscribeTopic(key, dest, (msg) => {
      try {
        const data = JSON.parse(msg.body);

        if (type === "bank") {
          this.bank$.next(data);
        } else if (type === "upi") {
          this.upi$.next(data);
        }
      } catch (e) {}
    });
  }

  getBankAndUpi(type: "bank" | "upi"): Observable<any> {
    return (type === "bank" ? this.bank$ : this.upi$)
      .asObservable()
      .pipe(filter((x) => x !== null));
  }

  unsubscribeGetBankAndUpi(portalId: string, type: "bank" | "upi") {
    if (!portalId || !type) return;

    const key = `upibank:list:${portalId}:${type}`;
    this.unsubscribeTopic(key);
  }

  destroyAll(): void {
    try {
      this.subscriptions.forEach((sub) => {
        try {
          sub?.unsubscribe();
        } catch (e) {}
      });

      this.subscriptions.clear();
      this.activeTopics.clear();
      this.pendingSubscribeTasks = [];

      this.pendingSubject.next(null);
      this.threads$.next(null);
      this.notification$.next(null);
      this.upi$.next(null);
      this.bank$.next(null);
      this.threadsUser$.next(null);
      this.messagePage$.next(null);
      this.newMessage$.next(null);
      this.latestBalance$.next(null);

      if (this.stompClient && this.stompClient.active) {
        this.stompClient.deactivate();
      }

      this.connected = false;
    } catch (e) {}
  }

  private publishWithAuth(destination: string, body: any) {
    const token = this.memoryService.getAccessToken();
    if (!token) return;

    this.stompClient.publish({
      destination,
      headers: { token },
      body: JSON.stringify(body),
    });
  }
}