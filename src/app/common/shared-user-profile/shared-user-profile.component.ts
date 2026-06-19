
import { Component, OnInit } from "@angular/core";
import { UserService } from "../../pages/services/user.service";
import { UserStateService } from "../../store/user-state.service";

@Component({
  selector: "app-shared-user-profile",
  templateUrl: "./shared-user-profile.component.html",
  styleUrl: "./shared-user-profile.component.css",
})
export class SharedUserProfileComponent implements OnInit {
  currentUserId: any;
  userFullDetail: any = null;
  errorMessage: any;
  isLoading: boolean = true;

  constructor(
    private userService: UserService,
    private userStateService: UserStateService,
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.userStateService.getUserId();
    this.userService.getUserFullDetail(this.currentUserId).subscribe({
      next: (data: any) => {
        this.userFullDetail = data?.data || data;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.message || "Failed to load user details.";
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
}
