// import { Injectable } from "@angular/core";
// import { BehaviorSubject, Observable, filter } from "rxjs";
// import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
// import SockJS from "sockjs-client";
// import baseUrl from "../helper";

// @Injectable({
//   providedIn: "root",
// })
// export class SocketConfigService {
//   private stompClient!: Client | any;
//   private connected = false;

//   private pendingSubject = new BehaviorSubject<any>(null);
//   public threads$ = new BehaviorSubject<any>(null);
//   public notification$ = new BehaviorSubject<any>(null);
//   public threadsUser$ = new BehaviorSubject<any>(null);
//   public messagePage$ = new BehaviorSubject<any>(null);
//   public newMessage$ = new BehaviorSubject<any>(null);
//   public latestBalance$ = new BehaviorSubject<any>(null);
//   private bank$ = new BehaviorSubject<any>(null);
//   private upi$ = new BehaviorSubject<any>(null);

//   private subscriptions = new Map<string, StompSubscription | null>();
//   private pendingSubscribeTasks: (() => void)[] = [];

//   private branchId?: string;
//   private userId?: string;
//   private entityId?: string;

//   constructor() { }

//   private ensureConnected(opts?: { branchId?: any; userId?: any }) {
//     if (opts?.branchId) this.branchId = opts.branchId;
//     if (opts?.userId) this.userId = opts.userId;

//     if (!this.stompClient || !this.stompClient.active) {
//       this.connect({ branchId: this.branchId, userId: this.userId });
//     }
//   }

//   connect(opts?: { branchId?: any; userId?: any }): void {
//     if (opts?.branchId) this.branchId = opts.branchId;
//     if (opts?.userId) this.userId = opts.userId;

//     if (this.connected && this.stompClient?.active) {
//       return;
//     }

//     this.stompClient = new Client({
//       webSocketFactory: () =>
//         new SockJS(baseUrl + "/socket-process", undefined, {
//           // @ts-ignore
//           withCredentials: true,
//         }),
//       reconnectDelay: 5000,
//       heartbeatIncoming: 10000,
//       heartbeatOutgoing: 10000,
//       debug: (msg: string) => { },
//     });

//     this.stompClient.onConnect = () => {
//       this.connected = true;
//       while (this.pendingSubscribeTasks.length) {
//         const task = this.pendingSubscribeTasks.shift();
//         try {
//           task && task();
//         } catch (e) {
//           console.warn("subscribe task failed", e);
//         }
//       }
//     };

//     this.stompClient.onStompError = (frame: any) => {
//       console.error("STOMP Error:", frame);
//     };

//     this.stompClient.onWebSocketClose = (evt: any) => {
//       console.warn("WebSocket closed", evt);
//       this.connected = false;
//       this.subscriptions.forEach((sub, key) => {
//         this.subscriptions.set(key, null);
//       });
//     };

//     this.stompClient.activate();
//   }

//   disconnect(): void {
//     try {
//       if (this.stompClient && this.stompClient.active) {
//         this.stompClient.deactivate();
//       }
//     } catch (e) {
//       console.warn("Error during deactivate", e);
//     }
//     this.connected = false;
//     this.subscriptions.forEach((s) => {
//       try {
//         s?.unsubscribe();
//       } catch (_e) { }
//     });
//     this.subscriptions.clear();
//     this.pendingSubscribeTasks = [];
//     this.pendingSubject.next(null);
//     this.threads$.next(null);
//     this.threadsUser$.next(null);
//     this.messagePage$.next(null);
//     this.newMessage$.next(null);
//   }

//   private subscribeTopic(
//     key: string,
//     destination: string,
//     handler: (msg: IMessage) => void
//   ): void {
//     const doSubscribe = () => {
//       const existing = this.subscriptions.get(key);
//       if (existing) return;

//       try {
//         const sub: StompSubscription = this.stompClient.subscribe(
//           destination,
//           (msg: IMessage) => {
//             try {
//               handler(msg);
//             } catch (e) {
//               console.error("handler error", e);
//             }
//           }
//         );
//         this.subscriptions.set(key, sub);
//       } catch (e) {
//         console.error("subscribeTopic failed", e);
//       }
//     };

//     if (!this.connected || !this.stompClient?.active) {
//       this.pendingSubscribeTasks.push(doSubscribe);
//       if (!this.stompClient?.active) {
//         this.connect({ branchId: this.branchId, userId: this.userId });
//       }
//     } else {
//       doSubscribe();
//     }
//   }

//   private unsubscribeTopic(key: string): void {
//     if (!key) return;
//     const sub = this.subscriptions.get(key);
//     if (!sub) {
//       this.subscriptions.delete(key);
//       return;
//     }
//     try {
//       sub.unsubscribe();
//     } catch (e) {
//       console.warn("unsubscribeTopic error", e);
//     }
//     this.subscriptions.delete(key);
//   }

//   subscribeToPendingData(branchId?: string) {
//     if (branchId) this.branchId = branchId;
//     if (!this.branchId)
//       throw new Error("branchId required for pendingData topic");

//     const key = `pendingData:${this.branchId}`;
//     const dest = `/topic/pendingData/${this.branchId}`;

//     this.subscribeTopic(key, dest, (msg) => {
//       try {
//         const data = JSON.parse(msg.body);
//         this.pendingSubject.next(data);
//       } catch (e) {
//         console.error("Error parsing pendingData", e);
//       }
//     });
//   }

//   getPendingData(): Observable<any> {
//     return this.pendingSubject.asObservable().pipe(filter((x) => x !== null));
//   }

//   unsubscribePendingData() {
//     if (!this.branchId) return;
//     this.unsubscribeTopic(`pendingData:${this.branchId}`);
//   }

//   subscribeThreads(entityId?: string) {
//     if (entityId) this.entityId = entityId;
//     if (!this.entityId) throw new Error("entityId required for threads topic");

//     const key = `threads:list:${this.entityId}`;
//     const dest = `/topic/chat/threads/${this.entityId}`;

//     this.subscribeTopic(key, dest, (msg) => {
//       try {
//         const data = JSON.parse(msg.body);
//         this.threads$.next(data);
//       } catch (e) {
//         console.error("Error parsing thread message", e);
//       }
//     });
//   }

//   getThreads(): Observable<any> {
//     return this.threads$.asObservable().pipe(filter((x) => x !== null));
//   }

//   unsubscribeThreads(entityId?: string) {
//     const id = entityId ?? this.entityId;
//     if (!id) return;
//     const key = `threads:list:${id}`;
//     this.unsubscribeTopic(key);
//   }

//   subscribeUnreadThreads(entityId?: string) {
//     if (entityId) this.entityId = entityId;
//     if (!this.entityId) throw new Error("entityId required for unread threads");

//     const key = `threads:reads:${this.entityId}`;
//     const dest = `/topic/chat/threads/reads/${this.entityId}`;

//     this.subscribeTopic(key, dest, (msg) => {
//       try {
//         const data = JSON.parse(msg.body);
//         this.threadsUser$.next(data);
//       } catch (e) {
//         console.error("Error parsing unread thread message", e);
//       }
//     });
//   }

//   getUnreadThreads(): Observable<any> {
//     return this.threadsUser$.asObservable().pipe(filter((x) => x !== null));
//   }

//   unsubscribeUnreadThreads(entityId?: string) {
//     const id = entityId ?? this.entityId;
//     if (!id) return;
//     const key = `threads:reads:${id}`;
//     this.unsubscribeTopic(key);
//   }

//   subscribeMessagePage(threadId: string) {
//     const key = `messagePage:${threadId}`;
//     const dest = `/topic/chat/thread/${threadId}/messages`;

//     this.subscribeTopic(key, dest, (msg) => {
//       try {
//         const data = JSON.parse(msg.body);
//         this.messagePage$.next(data);
//       } catch (e) {
//         console.error("Error parsing message page", e);
//       }
//     });
//   }

//   getMessages(): Observable<any> {
//     return this.messagePage$.asObservable().pipe(filter((x) => x !== null));
//   }

//   unsubscribeMessagePage(threadId: string) {
//     this.unsubscribeTopic(`messagePage:${threadId}`);
//   }

//   loadThreads(userId: string, type: string) {
//     if (!this.stompClient || !this.stompClient.active) {
//       this.pendingSubscribeTasks.push(() => this.loadThreads(userId, type));
//       this.ensureConnected({ userId });
//       return;
//     }

//     this.stompClient.publish({
//       destination: "/app/user/threads",
//       body: JSON.stringify({ userId, type }),
//     });
//   }

//   loadMessagePage(threadId: string, page = 0, size = 15) {
//     if (!this.stompClient || !this.stompClient.active) {
//       this.pendingSubscribeTasks.push(() =>
//         this.loadMessagePage(threadId, page, size)
//       );
//       this.ensureConnected();
//       return;
//     }

//     this.stompClient.publish({
//       destination: "/app/thread/messages",
//       body: JSON.stringify({ threadId, page, size }),
//     });
//   }

//   sendMessage(threadId: string, message: any) {
//     if (!this.stompClient || !this.stompClient.active) {
//       this.pendingSubscribeTasks.push(() =>
//         this.sendMessage(threadId, message)
//       );
//       this.ensureConnected();
//       return;
//     }

//     this.stompClient.publish({
//       destination: "/app/thread/send",
//       body: JSON.stringify({ threadId, message }),
//     });
//   }
//   subscribeLatestBalance(entityType?: string, entityId?: string) {
//     if (entityId) this.entityId = entityId;
//     const type = entityType?.toUpperCase() ?? "GENERIC";
//     if (!this.entityId)
//       throw new Error("entityId required for latest balance topic");

//     const key = `latestBalance:${this.entityId}`;
//     const dest = `/topic/entity/latest-balance/${type}/${this.entityId}`;

//     this.subscribeTopic(key, dest, (msg) => {
//       try {

//         const data = JSON.parse(msg.body);
//         this.latestBalance$.next(data);
//       } catch (e) {
//         console.error("Error parsing latest balance", e);
//       }
//     });
//   }

//   getLatestBalance(): Observable<any> {
//     return this.latestBalance$
//       .asObservable()
//       .pipe(filter((x) => x !== null));
//   }

//   unsubscribeLatestBalance(entityId?: string) {
//     const id = entityId ?? this.entityId;
//     if (!id) return;

//     const key = `latestBalance:${id}`;
//     this.unsubscribeTopic(key);
//   }

//   subscribeNotifications(entityId?: string | null) {
//     // if (entityId) this.userId = entityId;
//     // if (!this.entityId) throw new Error("userId required for threads topic");

//     const key = `threads:list:${entityId}`;
//     const dest = `/topic/notifications/${entityId}`;

//     this.subscribeTopic(key, dest, (msg) => {
//       try {
//         const data = JSON.parse(msg.body);
//         this.notification$.next(data);
//       } catch (e) {
//         console.error("Error parsing thread message", e);
//       }
//     });
//   }

//   getNotifications(): Observable<any> {
//     return this.notification$.asObservable().pipe(filter((x) => x !== null));
//   }

//   unsubscribeNotifications(entityId?: string) {
//     const id = entityId ?? this.entityId;
//     if (!id) return;
//     const key = `threads:list:${id}`;
//     this.unsubscribeTopic(key);
//   }

//   subscribeGetBankAndUpi(portalId: string, type: "bank" | "upi") {
//     if (!portalId || !type) return;

//     const key = `upibank:list:${portalId}:${type}`;
//     const dest = `/topic/payments/${portalId}/${type}`;

//     this.subscribeTopic(key, dest, (msg) => {
//       try {
//         const data = JSON.parse(msg.body);

//         if (type === "bank") {
//           this.bank$.next(data);
//         } else if (type === "upi") {
//           this.upi$.next(data);
//         }

//       } catch (e) {
//         console.error("Error parsing bank/upi message", e);
//       }
//     });
//   }

//   // sendFiltersToUpiAndBank(entityId: string, minAmount: any,maxAmount:any) {
//   //   if (!this.stompClient || !this.stompClient.active) {
//   //     this.pendingSubscribeTasks.push(() =>
//   //       this.sendFiltersToUpiAndBank(entityId, minAmount,maxAmount)
//   //     );
//   //     this.ensureConnected();
//   //     return;
//   //   }

//   //   this.stompClient.publish({
//   //     destination: "/app/payments/filter",
//   //     body: JSON.stringify({entityId, minAmount,maxAmount }),
//   //   });
//   // }

//   getBankAndUpi(type: "bank" | "upi"): Observable<any> {
//     return (type === "bank" ? this.bank$ : this.upi$)
//       .asObservable()
//       .pipe(filter((x) => x !== null));
//   }

//   unsubscribeGetBankAndUpi(portalId: string, type: "bank" | "upi") {
//     if (!portalId || !type) return;

//     const key = `upibank:list:${portalId}:${type}`;
//     this.unsubscribeTopic(key);
//   }

//   destroyAll(): void {
//     try {
//       this.subscriptions.forEach((sub, key) => {
//         try {
//           sub?.unsubscribe();
//         } catch (e) {
//           console.warn("Error unsubscribing:", key, e);
//         }
//       });
//       this.subscriptions.clear();

//       this.pendingSubscribeTasks = [];

//       this.pendingSubject.next(null);
//       this.threads$.next(null);
//       this.notification$.next(null);
//       this.upi$.next(null);
//       this.bank$.next(null);

//       this.threadsUser$.next(null);
//       this.messagePage$.next(null);
//       this.newMessage$.next(null);
//       this.latestBalance$.next(null);

//       if (this.stompClient && this.stompClient.active) {
//         this.stompClient.deactivate();
//       }

//       this.connected = false;

//     } catch (e) {
//       console.error("destroyAll error:", e);
//     }
//   }

// }

import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, filter } from "rxjs";
import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import baseUrl from "../helper";

@Injectable({
  providedIn: "root",
})
export class SocketConfigService {
  private stompClient!: Client | any;
  private connected = false;

  private pendingSubject = new BehaviorSubject<any>(null);
  public threads$ = new BehaviorSubject<any>(null);
  public notification$ = new BehaviorSubject<any>(null);
  public threadsUser$ = new BehaviorSubject<any>(null);
  public messagePage$ = new BehaviorSubject<any>(null);
  public newMessage$ = new BehaviorSubject<any>(null);
  public latestBalance$ = new BehaviorSubject<any>(null);
  private bank$ = new BehaviorSubject<any>(null);
  private upi$ = new BehaviorSubject<any>(null);

  private subscriptions = new Map<string, StompSubscription | null>();
  private pendingSubscribeTasks: (() => void)[] = [];

  private branchId?: string;

  // Keep separate ids so one socket stream does not overwrite another
  private threadsEntityId?: string;
  private unreadThreadsEntityId?: string;
  private latestBalanceEntityId?: string;
  private notificationEntityId?: string;

  constructor() {}

  private ensureConnected(opts?: { branchId?: any; userId?: any }) {
    if (opts?.branchId) this.branchId = opts.branchId;
    if (opts?.userId) {
      // kept only to preserve current connect flow
    }

    if (!this.stompClient || !this.stompClient.active) {
      this.connect({ branchId: this.branchId, userId: opts?.userId });
    }
  }

  connect(opts?: { branchId?: any; userId?: any }): void {
    if (opts?.branchId) this.branchId = opts.branchId;

    if (this.connected && this.stompClient?.active) {
      return;
    }

    this.stompClient = new Client({
      webSocketFactory: () =>
        new SockJS(baseUrl + "/socket-process", undefined, {
          // @ts-ignore
          withCredentials: true,
        }),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: (_msg: string) => {},
    });

    this.stompClient.onConnect = () => {
      this.connected = true;
      while (this.pendingSubscribeTasks.length) {
        const task = this.pendingSubscribeTasks.shift();
        try {
          task && task();
        } catch (e) {
          console.warn("subscribe task failed", e);
        }
      }
    };

    this.stompClient.onStompError = (frame: any) => {
      console.error("STOMP Error:", frame);
    };

    this.stompClient.onWebSocketClose = (evt: any) => {
      console.warn("WebSocket closed", evt);
      this.connected = false;
      this.subscriptions.forEach((_sub, key) => {
        this.subscriptions.set(key, null);
      });
    };

    this.stompClient.activate();
  }

  disconnect(): void {
    try {
      if (this.stompClient && this.stompClient.active) {
        this.stompClient.deactivate();
      }
    } catch (e) {
      console.warn("Error during deactivate", e);
    }

    this.connected = false;

    this.subscriptions.forEach((s) => {
      try {
        s?.unsubscribe();
      } catch (_e) {}
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
    handler: (msg: IMessage) => void,
  ): void {
    const doSubscribe = () => {
      const existing = this.subscriptions.get(key);
      if (existing) return;

      try {
        const sub: StompSubscription = this.stompClient.subscribe(
          destination,
          (msg: IMessage) => {
            try {
              handler(msg);
            } catch (e) {
              console.error("handler error", e);
            }
          },
        );
        this.subscriptions.set(key, sub);
      } catch (e) {
        console.error("subscribeTopic failed", e);
      }
    };

    if (!this.connected || !this.stompClient?.active) {
      this.pendingSubscribeTasks.push(doSubscribe);
      if (!this.stompClient?.active) {
        this.connect({ branchId: this.branchId });
      }
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
    } catch (e) {
      console.warn("unsubscribeTopic error", e);
    }

    this.subscriptions.delete(key);
  }

  subscribeToPendingData(branchId?: string) {
    if (branchId) this.branchId = branchId;
    if (!this.branchId)
      throw new Error("branchId required for pendingData topic");

    const key = `pendingData:${this.branchId}`;
    const dest = `/topic/pendingData/${this.branchId}`;

    this.subscribeTopic(key, dest, (msg) => {
      try {
        const data = JSON.parse(msg.body);
        this.pendingSubject.next(data);
      } catch (e) {
        console.error("Error parsing pendingData", e);
      }
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
      } catch (e) {
        console.error("Error parsing thread message", e);
      }
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
      } catch (e) {
        console.error("Error parsing unread thread message", e);
      }
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
      } catch (e) {
        console.error("Error parsing message page", e);
      }
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
      this.ensureConnected({ userId });
      return;
    }

    this.stompClient.publish({
      destination: "/app/user/threads",
      body: JSON.stringify({ userId, type }),
    });
  }

  loadMessagePage(threadId: string, page = 0, size = 15) {
    if (!this.stompClient || !this.stompClient.active) {
      this.pendingSubscribeTasks.push(() =>
        this.loadMessagePage(threadId, page, size),
      );
      this.ensureConnected();
      return;
    }

    this.stompClient.publish({
      destination: "/app/thread/messages",
      body: JSON.stringify({ threadId, page, size }),
    });
  }

  sendMessage(threadId: string, message: any) {
    if (!this.stompClient || !this.stompClient.active) {
      this.pendingSubscribeTasks.push(() =>
        this.sendMessage(threadId, message),
      );
      this.ensureConnected();
      return;
    }

    this.stompClient.publish({
      destination: "/app/thread/send",
      body: JSON.stringify({ threadId, message }),
    });
  }

  subscribeLatestBalance(entityType?: string, entityId?: string) {
    if (entityId) this.latestBalanceEntityId = entityId;
    const id = entityId ?? this.latestBalanceEntityId;
    const type = entityType?.toUpperCase() ?? "GENERIC";

    if (!id) throw new Error("entityId required for latest balance topic");

    // key includes type so same entityId across types won't collide
    const key = `latestBalance:${type}:${id}`;
    const dest = `/topic/entity/latest-balance/${type}/${id}`;

    this.subscribeTopic(key, dest, (msg) => {
      try {
        const data = JSON.parse(msg.body);
        this.latestBalance$.next(data);
      } catch (e) {
        console.error("Error parsing latest balance", e);
      }
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

    // fixed: dedicated notification key instead of reusing threads:list
    const key = `notifications:${id}`;
    const dest = `/topic/notifications/${id}`;

    this.subscribeTopic(key, dest, (msg) => {
      try {
        const data = JSON.parse(msg.body);
        this.notification$.next(data);
      } catch (e) {
        console.error("Error parsing notification message", e);
      }
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
      } catch (e) {
        console.error("Error parsing bank/upi message", e);
      }
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
      this.subscriptions.forEach((sub, key) => {
        try {
          sub?.unsubscribe();
        } catch (e) {
          console.warn("Error unsubscribing:", key, e);
        }
      });

      this.subscriptions.clear();
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
    } catch (e) {
      console.error("destroyAll error:", e);
    }
  }
}
