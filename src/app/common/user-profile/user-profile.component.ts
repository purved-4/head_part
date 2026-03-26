import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  HostListener,
} from "@angular/core";
import { UserService } from "../../pages/services/user.service";
import { UserStateService } from "../../store/user-state.service";
import { Subscription } from "rxjs";

// ... (interfaces same rahengi) ...

@Component({
  selector: "app-user-profile",
  templateUrl: "./user-profile.component.html",
  styleUrls: ["./user-profile.component.css"],
})
export class UserProfileComponent implements OnInit, OnDestroy {
  user: any | null = null;
  userFullDetail: any = null;
  @Output() closeProfile = new EventEmitter<void>(); 

  @Output() passwordChanged = new EventEmitter<{
    oldPassword: string;
    newPassword: string;
  }>();

  selectedSection: "user" | "entity" | "portal" | "password" = "user";

  branch: any = null;
  entityInfo: any = null;
  portalInfoRaw: any[] = [];
  portalInfo: any[] = [];
  expandedPortals: Set<string> = new Set();
  expandedRawData: Set<string> = new Set();

  rewards: any[] = [];
  payouts: any[] = [];
  processingTimeList: any[] = [];

  

  portalIdToDomain: Record<string, string> = {};
  rewardsByDomain: Record<string, any[]> = {};
  payoutsByDomain: Record<string, any[]> = {};

  btnClass =
    "block px-3 py-2 rounded-lg text-sm text-neutral-700 hover:bg-neutral-100";
  selectedBtnClass =
    "block px-3 py-2 rounded-lg text-sm bg-primary-600 text-white";

  // Mobile sidebar state
  isMobileView = false;
  isMobileDropdownOpen = false; // 👈 NAYA NAAM: dropdown

  // Password state
  passwordData: any = {
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  };
  errorMessage: string = "";
  successMessage: string = "";

  currentRoleId: any;
  currentUserId: any;
  role: any;

  roleColors = {
    primary: "#5A0B95",
    secondary: "#FFDF80",
    bg: "#F8F5FF",
    font: "#FFFFFF",
    border: "#E6C44A",
    hover: "#6B1FB3",
    glow: "rgba(90,11,149,0.50)",
  };

  roleColorMap = {
    /* ... same as before ... */
  };

  private subs: Subscription[] = [];

  constructor(
    private userService: UserService,
    private userStateService: UserStateService,
  ) {}

  ngOnInit(): void {
    this.currentRoleId = this.userStateService.getCurrentEntityId();
    this.currentUserId = this.userStateService.getUserId();
    this.checkMobileView();
    this.role = this.userStateService.getRole();

    this.errorMessage = "";
    const s = this.userService.getUserFullDetail(this.currentUserId).subscribe({
      next: (data: any) => {
        this.userFullDetail = data;
        this.processIncomingPayload(data);
      },
      error: (err) => {
        console.error("Failed to load user full detail", err);
        this.errorMessage =
          err?.error?.message || "Failed to load user details.";
      },
    });
    this.subs.push(s);
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
  }

  // Dropdown toggle
  toggleMobileDropdown() {
    this.isMobileDropdownOpen = !this.isMobileDropdownOpen;
  }

  // Close dropdown and go back to profile section
  closeDropdownAndGoToProfile() {
    this.isMobileDropdownOpen = false;
    this.selectedSection = "user";
  }

  // Select section – closes dropdown on mobile
  selectSection(section: string) {
    this.selectedSection = section as any;
    if (this.isMobileView) {
      this.isMobileDropdownOpen = false;
    }
  }

  private processIncomingPayload(data: any) {
    if (!data) return;
    const u = data?.userInfo || data?.user || {};
    this.user = {
      id: u?.id,
      name: u?.name || u?.username || u?.fullName,
      email: u?.email,
      username: u?.username || u?.name,
      role: u?.role,
      phone: u?.phone || u?.mobile,
      active: u?.lastActive ?? true,
    };

    const ent = data?.entityInfo || data?.entity || {};
    this.entityInfo = {
      id: ent?.id,
      name: ent?.name || ent?.entityName,
      limit: ent?.balance ?? ent?.limit ?? null,
      raw: ent,
    };

    this.branch = data?.branchInfo ||
      data?.branch || {
        name: data?.branchName,
        balance: data?.branchBalance,
      };

    this.portalInfoRaw = Array.isArray(data?.portalInfo)
      ? data.portalInfo
      : data?.portals || [];
    this.portalInfo = this.mapPortalInfo(this.portalInfoRaw || []);

    this.portalIdToDomain = {};
    for (const w of this.portalInfo) {
      if (w.portalId)
        this.portalIdToDomain[w.portalId] =
          w.portalDomain || w._raw?.name || w.portalId;
    }

    this.rewards = [];
    this.payouts = [];

    for (const w of this.portalInfo) {
      const domain =
        w.portalDomain || w._raw?.name || w.portalId || "unknown";

      if (w.topupsTimeStrength) {
        this.rewards.push({
          portalId: w.portalId,
          portalDomain: domain,
          type: "topup",
          timeRanges: Array.isArray(w.topupsTimeStrength)
            ? w.topupsTimeStrength
            : w.topupsTimeStrength?.timeRanges || [],
          amountRanges: w._raw?.topupsAmountRanges || [],
        });
      } else if (w._raw?.topupsTimeStrength) {
        this.rewards.push({
          portalId: w.portalId,
          portalDomain: domain,
          type: "topup",
          timeRanges: w._raw?.topupsTimeStrength?.timeRanges || [],
          amountRanges: w._raw?.topups_amount_ranges || [],
        });
      }

      if (w.payoutsTimeStrength) {
        this.payouts.push({
          portalId: w.portalId,
          portalDomain: domain,
          amountRanges: Array.isArray(w.payoutsTimeStrength)
            ? w.payoutsTimeStrength
            : w.payoutsTimeStrength?.amountRanges || [],
        });
      } else if (w._raw?.payoutsTimeStrength) {
        this.payouts.push({
          portalId: w.portalId,
          portalDomain: domain,
          amountRanges: w._raw?.payoutsTimeStrength?.amountRanges || [],
        });
      }
    }

    this.rewardsByDomain = this.groupByDomain(
      this.rewards.map((r) => ({
        portalId: r.portalId,
        portalDomain: r.portalDomain,
        ...r,
      })),
    );
    this.payoutsByDomain = this.groupByDomain(
      this.payouts.map((p) => ({
        portalId: p.portalId,
        portalDomain: p.portalDomain,
        ...p,
      })),
    );

    const processingCollect: any[] = [];
    for (const w of this.portalInfo) {
      const domain = w.portalDomain || w.portalId || "unknown";
      const entries = Array.isArray(w.processingTime)
        ? w.processingTime.map((e: any) => ({
            id: e?.id,
            minRange: e?.min ?? e?.minRange ?? e?.min_range ?? null,
            maxRange: e?.max ?? e?.maxRange ?? e?.max_range ?? null,
            time: e?.time ?? e?.timeMinutes ?? null,
            isUpto: e?.isUpto ?? e?.upto ?? e?.is_upto ?? false,
          }))
        : w._raw?.processingTime || [];
      processingCollect.push({ [domain]: entries });
    }
    this.processingTimeList = this.normalizeProcessingTime(processingCollect);
  }

  private mapPortalInfo(portalInfo: any[]): any[] {
    const out: any[] = [];
    for (const w of portalInfo) {
      const processingTime = Array.isArray(w.processingTime)
        ? w.processingTime
        : w.processing_time || w._processingTime || [];
      out.push({
        portalId: w.id ?? w.webId ?? w.portalId ?? null,
        portalDomain:
          w.name ?? w.portalDomain ?? w.domain ?? w._raw?.name ?? "unknown",
        topupPercentage: w.topupPercentage ?? w.topup_percentage ?? null,
        payoutPercentage: w.payoutPercentage ?? w.payout_percentage ?? null,
        payoutsTimeStrength:
          w.payoutsTimeStrength ??
          w.payouts_time_strength ??
          w.payoutTimeStrength ??
          w.payout_time_strength ??
          null,
        topupsTimeStrength:
          w.topupsTimeStrength ??
          w.topups_time_strength ??
          w.topupTimeStrength ??
          w.topup_time_strength ??
          null,
        processingTime: processingTime.map((d: any) => ({
          id: d?.id,
          minRange: d?.min ?? d?.minRange ?? d?.min_range ?? null,
          maxRange: d?.max ?? d?.maxRange ?? d?.max_range ?? null,
          time: d?.time ?? d?.minutes ?? null,
          isUpto: d?.isUpto ?? d?.upto ?? false,
          _raw: d,
        })),
        _raw: w,
      });
    }
    return out;
  }

  private groupByDomain(entries: any[]): Record<string, any[]> {
    const map: Record<string, any[]> = {};
    if (!Array.isArray(entries)) return map;
    for (const e of entries) {
      const webId = e.portalId || e.webId || e.webID || null;
      const domain =
        webId && this.portalIdToDomain[webId]
          ? this.portalIdToDomain[webId]
          : e.portalDomain || e.portalName || webId || "unknown";
      if (!map[domain]) map[domain] = [];
      map[domain].push(e);
    }
    return map;
  }

  private normalizeProcessingTime(
    list: any[],
  ): { domain: string; entries: any[] }[] {
    const out: { domain: string; entries: any[] }[] = [];
    if (!Array.isArray(list)) return out;
    for (const obj of list) {
      const keys = Object.keys(obj || {});
      for (const k of keys) {
        const entriesRaw = obj[k] || [];
        const entries = (entriesRaw || []).map((e: any) => ({
          id: e.id,
          minRange: e.minRange ?? e.min ?? e.min_range ?? null,
          maxRange: e.maxRange ?? e.max ?? e.max_range ?? null,
          time: e.time ?? e.minutes ?? null,
          isUpto: e.isUpto ?? e.upto ?? false,
        }));
        out.push({ domain: k, entries });
      }
    }
    return out;
  }

  get rewardsByDomainKeys() {
    return Object.keys(this.rewardsByDomain || {});
  }
  get payoutsByDomainKeys() {
    return Object.keys(this.payoutsByDomain || {});
  }
  get rewardsList() {
    return this.rewards || [];
  }
  get payoutsList() {
    return this.payouts || [];
  }

  changePassword() {
    this.errorMessage = "";
    this.successMessage = "";

    if (
      !this.passwordData.oldPassword ||
      !this.passwordData.newPassword ||
      !this.passwordData.confirmPassword
    ) {
      this.errorMessage = "All password fields are required";
      return;
    }
    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      this.errorMessage = "New password and confirmation do not match";
      return;
    }
    if (this.passwordData.newPassword.length < 6) {
      this.errorMessage = "Password must be at least 6 characters long";
      return;
    }
    if (this.passwordData.oldPassword === this.passwordData.newPassword) {
      this.errorMessage =
        "New password must be different from current password";
      return;
    }

    const payload = {
      userId: this.user?.id,
      oldPassword: this.passwordData.oldPassword,
      newPassword: this.passwordData.newPassword,
    };

    this.userService.updateUserPassword(payload).subscribe({
      next: (res: any) => {
        this.successMessage = res?.message || "Password updated successfully!";
        this.passwordData = {
          oldPassword: "",
          newPassword: "",
          confirmPassword: "",
        };
        setTimeout(() => {
          this.successMessage = "";
        }, 3000);
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.message ||
          "An error occurred while updating the password.";
      },
    });

    this.passwordChanged.emit({
      oldPassword: payload.oldPassword,
      newPassword: payload.newPassword,
    });
  }

  togglePortal(portalId: string) {
    if (this.expandedPortals.has(portalId)) {
      this.expandedPortals.delete(portalId);
    } else {
      this.expandedPortals.add(portalId);
    }
  }

  isPortalExpanded(portalId: string): boolean {
    return this.expandedPortals.has(portalId);
  }

  toggleRawData(portalId: string) {
    if (this.expandedRawData.has(portalId)) {
      this.expandedRawData.delete(portalId);
    } else {
      this.expandedRawData.add(portalId);
    }
  }

  isRawDataExpanded(portalId: string): boolean {
    return this.expandedRawData.has(portalId);
  }

  copyRawData(portal: any) {
    const data = JSON.stringify(portal._raw, null, 2);
    navigator.clipboard.writeText(data).then(() => {});
  }

  @HostListener("window:resize")
  onResize() {
    this.checkMobileView();
  }

  checkMobileView() {
    this.isMobileView = window.innerWidth < 768;
    if (!this.isMobileView) {
      this.isMobileDropdownOpen = false;
    }
  }
  closeMobileDropdown() {
    this.isMobileDropdownOpen = false;
  }
  closeMobileProfile() {
    this.closeProfile.emit();  // Parent component ko batao ki profile band karo
  }
}


