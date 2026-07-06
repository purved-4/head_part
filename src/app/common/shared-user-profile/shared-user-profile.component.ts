import { Component, OnInit } from "@angular/core";
import { UserService } from "../../pages/services/user.service";
import { UserStateService } from "../../store/user-state.service";
import { uiUrl } from "../../pages/services/helper"; // <-- apne actual path se adjust karna
import { HeadService } from "../../pages/services/head.service";
import { SnackbarService } from "../snackbar/snackbar.service";

@Component({
  selector: "app-shared-user-profile",
  templateUrl: "./shared-user-profile.component.html",
  styleUrl: "./shared-user-profile.component.css",
})
export class SharedUserProfileComponent implements OnInit {
  currentUserId: any;
  currentEntityId: any;
  userFullDetail: any = null;
  errorMessage: any;
  isLoading: boolean = true;

  // --- Promo code state ---
  isGeneratingCode: boolean = false;
  promoCode: string | null = null;
  promoUrl: string | null = null;
  promoError: string | null = null;
  copied: boolean = false;
  copiedCode: boolean = false;
  copiedLink: boolean = false;

  constructor(
    private userService: UserService,
    private userStateService: UserStateService,
    private headService: HeadService,
    private snackBar: SnackbarService,
  ) {}

  ngOnInit(): void {
    this.currentEntityId = this.userStateService.getCurrentEntityId();
    this.currentUserId = this.userStateService.getUserId();
    this.userService.getUserFullDetail(this.currentUserId).subscribe({
      next: (data: any) => {
        this.userFullDetail = data?.data || data;
        this.isLoading = false;
      },
      error: (err) => {
        this.snackBar.show(
          err.error.message || "Failed to load user details.",
          false,
        );
        this.isLoading = false;
      },
    });
  }

  get userInfo() {
    return this.userFullDetail?.userInfo || null;
  }

  get entityInfo() {
    return this.userFullDetail?.entityInfo || null;
  }

  get cpInfo() {
    return this.userFullDetail?.cpInfo || [];
  }

  get isHead(): boolean {
    return this.userInfo?.role === "HEAD";
  }

  get userInitials(): string {
    const name = this.userInfo?.name || "";
    return name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  get roleLabel(): string {
    const roleMap: Record<string, string> = {
      BRANCH: "Branch",
      ADMIN: "Admin",
      CP: "Channel Partner",
      SUPER_ADMIN: "Super Admin",
      HEAD: "Head",
    };
    return roleMap[this.userInfo?.role] || this.userInfo?.role || "—";
  }

  get statusColor(): string {
    return this.userInfo?.isActive
      ? "bg-emerald-100 text-emerald-700"
      : "bg-red-100 text-red-600";
  }

  get lastActiveFmt(): string {
    if (!this.userInfo?.lastActive) return "—";
    return new Date(this.userInfo.lastActive).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  generatePromoCode(): void {
    if (!this.currentUserId || this.isGeneratingCode) return;

    this.isGeneratingCode = true;
    this.promoError = null;
    this.copiedCode = false;
    this.copiedLink = false;

    this.headService.generatePromoCode(this.currentEntityId).subscribe({
      next: (res: any) => {
        const code = res?.code || res?.promoCode || res;
        this.promoCode = code;
        this.promoUrl = `${uiUrl}/register/code?code=${code}`; // <-- change yahan
        this.isGeneratingCode = false;
      },
      error: (err) => {
        this.snackBar.show(
          err?.error?.message || "Failed to generate promo code.",
          false,
        );
        this.isGeneratingCode = false;
      },
    });
  }

  copyPromoCode(): void {
    if (!this.promoCode) return;
    navigator.clipboard.writeText(this.promoCode).then(() => {
      this.copiedCode = true;
      setTimeout(() => (this.copiedCode = false), 2000);
    });
  }

  copyPromoUrl(): void {
    if (!this.promoUrl) return;
    navigator.clipboard.writeText(this.promoUrl).then(() => {
      this.copiedLink = true;
      setTimeout(() => (this.copiedLink = false), 2000);
    });
  }
}
