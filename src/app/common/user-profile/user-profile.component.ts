import {
  Component,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from "@angular/core";
import { UserService } from "../../pages/services/user.service";
import { UserStateService } from "../../store/user-state.service";
import { Subscription } from "rxjs";

/** --- Interfaces --- */
interface User {
  id?: string;
  username?: string;
  name?: string;
  email?: string;
  role?: string;
  phone?: string;
  active?: boolean;
}

interface PasswordData {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ProcessingEntry {
  id?: string;
  minRange?: number | null;
  maxRange?: number | null;
  time?: number | null;
  isUpto?: boolean;
  // raw fields from backend
  [k: string]: any;
}

interface WebsiteResponse {
  websiteId?: string | null;
  websiteDomain?: string;
  topupPercentage?: number | null;
  payoutPercentage?: number | null;
  topupsTimeStrength?: any;
  payoutsTimeStrength?: any;
  processingTime?: ProcessingEntry[];
  _raw?: any;
}

interface RewardEntry {
  websiteId?: string | null;
  websiteDomain?: string;
  type?: string;
  timeRanges?: any[];
  amountRanges?: any[];
  [k: string]: any;
}

@Component({
  selector: "app-user-profile",
  templateUrl: "./user-profile.component.html",
  styleUrls: ["./user-profile.component.css"],
})
export class UserProfileComponent implements OnInit, OnDestroy {
  // Component-managed data
  user: any | null = null;
  userFullDetail: any = null;

  @Output() passwordChanged = new EventEmitter<{
    oldPassword: string;
    newPassword: string;
  }>();

  // UI state: simplified to 3 sections as requested
  selectedSection: "user" | "entity" | "website" | "password" = "user";

  // Data helpers
  branch: any = null;
  entityInfo: any = null;
  websiteInfoRaw: any[] = [];
  websiteInfo: any[] = [];
  expandedWebsites: Set<string> = new Set();
  expandedRawData: Set<string> = new Set();

  rewards: RewardEntry[] = [];
  payouts: any[] = [];
  processingTimeList: { domain: string; entries: ProcessingEntry[] }[] = [];

  // grouped maps for fast rendering
  websiteIdToDomain: Record<string, string> = {};
  rewardsByDomain: Record<string, any[]> = {};
  payoutsByDomain: Record<string, any[]> = {};

  btnClass =
    "block px-3 py-2 rounded-lg text-sm text-neutral-700 hover:bg-neutral-100";
  selectedBtnClass =
    "block px-3 py-2 rounded-lg text-sm bg-primary-600 text-white";

  // password state
  passwordData: PasswordData = {
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  };

  errorMessage: string = "";
  successMessage: string = "";

  // identifiers from UserStateService
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

  // Role color mapping
  roleColorMap = {
    owner: {
      primary: "#5A0B95",
      secondary: "#FFDF80",
      bg: "#F8F5FF",
      font: "#FFFFFF",
      border: "#E6C44A",
      hover: "#6B1FB3",
      glow: "rgba(90,11,149,0.50)",
    },
    controller: {
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

  private subs: Subscription[] = [];

  constructor(
    private userService: UserService,
    private userStateService: UserStateService
  ) {}

  ngOnInit(): void {
    // get identifiers directly from UserStateService
    this.currentRoleId = this.userStateService.getCurrentRoleId();
    this.currentUserId = this.userStateService.getUserId();
    this.role = this.userStateService.getRole();

    this.setColors();
    if (!this.currentUserId) {
      this.errorMessage =
        "Unable to locate current user id (check authentication state).";
      return;
    }

    this.errorMessage = "";
    const s = this.userService
      .getUserFullDetail(this.currentUserId)
      .subscribe({
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

  setSection(section: any) {
    this.selectedSection = section;
  }

  setColors() {
  if (!this.role) return;

  switch (this.role.toLowerCase()) {
    case "owner":
      this.roleColors = this.roleColorMap.owner;
      break;

    case "chief":
      this.roleColors = this.roleColorMap.controller;
      break;

    case "manager":
      this.roleColors = this.roleColorMap.manager;
      break;

    case "head":
      this.roleColors = this.roleColorMap.head;
      break;

    case "branch":
      this.roleColors = this.roleColorMap.branch;
      break;

    default:
      this.roleColors = this.roleColors; // optional fallback
  }
}

  private processIncomingPayload(data: any) {
    if (!data) return;

    // --- basic user ---
    const u = data?.userInfo || data?.user || {};
    this.user = {
      id: u?.id,
      name: u?.name || u?.username || u?.fullName,
      email: u?.email,
      username: u?.username || u?.name,
      role: u?.role,
      phone: u?.phone || u?.mobile,
      active: u?.active ?? true,
    };

    // --- entity ---
    const ent = data?.entityInfo || data?.entity || {};
    this.entityInfo = {
      id: ent?.id,
      name: ent?.name || ent?.entityName,
      limit: ent?.balance ?? ent?.limit ?? null,
      raw: ent,
    };

    // --- branch (if present) ---
    this.branch = data?.branchInfo ||
      data?.branch || {
        name: data?.branchName,
        balance: data?.branchBalance,
      };

    // --- website raw list ---
    this.websiteInfoRaw = Array.isArray(data?.websiteInfo)
      ? data.websiteInfo
      : data?.websites || [];

    // normalize website entries into WebsiteResponse shape
    this.websiteInfo = this.mapWebsiteInfo(this.websiteInfoRaw || []);

    // build websiteId -> domain map
    this.websiteIdToDomain = {};
    for (const w of this.websiteInfo) {
      if (w.websiteId)
        this.websiteIdToDomain[w.websiteId] =
          w.websiteDomain || w._raw?.name || w.websiteId;
    }

    // build rewards and payouts lists per website
    this.rewards = [];
    this.payouts = [];

    for (const w of this.websiteInfo) {
      const domain =
        w.websiteDomain || w._raw?.name || w.websiteId || "unknown";

      // rewards: derive from topupsTimeStrength (if present) or topups config
      if (w.topupsTimeStrength) {
        this.rewards.push({
          websiteId: w.websiteId,
          websiteDomain: domain,
          type: "topup",
          timeRanges: Array.isArray(w.topupsTimeStrength)
            ? w.topupsTimeStrength
            : w.topupsTimeStrength?.timeRanges || [],
          amountRanges: w._raw?.topupsAmountRanges || [],
        });
      } else if (w._raw?.topupsTimeStrength) {
        this.rewards.push({
          websiteId: w.websiteId,
          websiteDomain: domain,
          type: "topup",
          timeRanges: w._raw?.topupsTimeStrength?.timeRanges || [],
          amountRanges: w._raw?.topups_amount_ranges || [],
        });
      }

      // payouts: derive from payoutsTimeStrength (if present)
      if (w.payoutsTimeStrength) {
        this.payouts.push({
          websiteId: w.websiteId,
          websiteDomain: domain,
          amountRanges: Array.isArray(w.payoutsTimeStrength)
            ? w.payoutsTimeStrength
            : w.payoutsTimeStrength?.amountRanges || [],
        });
      } else if (w._raw?.payoutsTimeStrength) {
        this.payouts.push({
          websiteId: w.websiteId,
          websiteDomain: domain,
          amountRanges: w._raw?.payoutsTimeStrength?.amountRanges || [],
        });
      }
    }

    // group rewards/payouts by domain for quicker template lookup
    this.rewardsByDomain = this.groupByDomain(
      this.rewards.map((r) => ({
        websiteId: r.websiteId,
        websiteDomain: r.websiteDomain,
        ...r,
      }))
    );
    this.payoutsByDomain = this.groupByDomain(
      this.payouts.map((p) => ({
        websiteId: p.websiteId,
        websiteDomain: p.websiteDomain,
        ...p,
      }))
    );

    // normalize processing time entries
    // Expecting website-level processingTime array, but backend shape may vary
    const processingCollect: any[] = [];
    for (const w of this.websiteInfo) {
      const domain = w.websiteDomain || w.websiteId || "unknown";
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

    // final console helpers
    console.log("user", this.user);
    console.log("entity", this.entityInfo);
    console.log("branch", this.branch);
    console.log("websites", this.websiteInfo);
    console.log("rewardsByDomain", this.rewardsByDomain);
    console.log("payoutsByDomain", this.payoutsByDomain);
    console.log("processingTimeList", this.processingTimeList);
  }

  /**
   * Convert websiteInfo array (API) into websiteResponse entries expected by the template.
   */
  private mapWebsiteInfo(websiteInfo: any[]): WebsiteResponse[] {
    const out: WebsiteResponse[] = [];
    for (const w of websiteInfo) {
      // backend may use different prop names; be defensive
      const processingTime = Array.isArray(w.processingTime)
        ? w.processingTime
        : w.processing_time || w._processingTime || [];

      out.push({
        websiteId: w.id ?? w.webId ?? w.websiteId ?? null,
        websiteDomain:
          w.name ?? w.websiteDomain ?? w.domain ?? w._raw?.name ?? "unknown",
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
      const webId = e.websiteId || e.webId || e.webID || null;
      const domain =
        webId && this.websiteIdToDomain[webId]
          ? this.websiteIdToDomain[webId]
          : e.websiteDomain || e.websiteName || webId || "unknown";

      if (!map[domain]) map[domain] = [];
      map[domain].push(e);
    }
    return map;
  }

  private normalizeProcessingTime(
    list: any[]
  ): { domain: string; entries: ProcessingEntry[] }[] {
    const out: { domain: string; entries: ProcessingEntry[] }[] = [];
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

  // --- getters for template ---
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

  // ----------------------------
  // Password change handling
  // ----------------------------
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

  toggleWebsite(websiteId: string) {
    if (this.expandedWebsites.has(websiteId)) {
      this.expandedWebsites.delete(websiteId);
    } else {
      this.expandedWebsites.add(websiteId);
    }
  }

  isWebsiteExpanded(websiteId: string): boolean {
    return this.expandedWebsites.has(websiteId);
  }

  toggleRawData(websiteId: string) {
    if (this.expandedRawData.has(websiteId)) {
      this.expandedRawData.delete(websiteId);
    } else {
      this.expandedRawData.add(websiteId);
    }
  }

  isRawDataExpanded(websiteId: string): boolean {
    return this.expandedRawData.has(websiteId);
  }

  copyRawData(website: any) {
    // Implementation to copy raw data to clipboard
    const data = JSON.stringify(website._raw, null, 2);
    navigator.clipboard.writeText(data).then(() => {
      // Show success message
    });
  }
}
