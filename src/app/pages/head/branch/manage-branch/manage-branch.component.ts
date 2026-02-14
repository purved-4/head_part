import {
  Component,
  OnInit,
  HostListener,
  ChangeDetectorRef,
} from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ManagerService } from "../../../services/manager.service";
import { BranchService } from "../../../services/branch.service";
import { HeadService } from "../../../services/head.service";
import { UserStateService } from "../../../../store/user-state.service";

interface WebsiteRange {
  websiteId: string;
  range: string;
  websiteDomain: string;
  active?: boolean;
  topupPercentage: number;
  payoutPercentage: number;
}

interface Agent {
  id: string;
  name: string;
  headId: string;
  email?: string;
  mobile?: string;
  info?: string;
  websitesWithRange: WebsiteRange[];
  active: boolean;
  isActive?: boolean;
  showAllWebsites?: boolean;
  isVerified?: boolean;
  lastUpdated?: string;
}

interface EditForm {
  id: string;
  name: string;
  email: string;
  mobile: string;
  info: string;
  isActive: boolean;
  websitesWithRange: WebsiteRange[];
}

interface Website {
  websiteId: string;
  websiteDomain: string;
  active?: boolean;
}

@Component({
  selector: "app-manage-branch",
  templateUrl: "./manage-branch.component.html",
})
export class ManageBranchComponent implements OnInit {
  agents: Agent[] = [];
  filteredAgents: Agent[] = [];
  paginatedAgents: any[] = [];

  page = 1;
  pageSize = 5;
  searchTerm = "";

  loading = true;
  error = "";
  currentUser!: string;

  // route / context ids
  headId: string = "";
  userId: string = "";
  routeUserId: string = "";
  currentRoleId: any;

  // Edit Modal Properties
  showEditModal = false;
  editForm: EditForm = {
    id: "",
    name: "",
    email: "",
    mobile: "",
    info: "",
    isActive: true,
    websitesWithRange: [],
  };

  // Website Selection Properties (for edit modal)
  websiteOptions: Website[] = [];
  filteredWebsites: Website[] = []; // not used in search-based version, kept for compatibility
  websitesForAdd: Website[] = [];
  addWebsiteSearchTerm: string = "";
  assignedWebsiteSearch: string = "";
  selectedWebsitesForAdd: string[] = [];
  loadingWebsites = false;

  // Validation errors
  emailError: string = "";
  mobileError: string = "";

  // toggles-in-flight
  togglingWebsite: Record<string, boolean> = {};
  togglingAgent: Record<string, boolean> = {};

  // Helper for template
  Math = Math;

  // Statistics
  activeAgentsCount = 0;
  totalWebsitesCount = 0;
  avgTopupPercentage = 0;
  statusFilter: any;

  // Website Modal Properties
  showSingleWebsiteModal = false;
  showAllWebsitesModal = false;
  selectedAgent: Agent | null = null;
  selectedWebsite: any = null;
  websiteModalSearchTerm: string = "";
  filteredModalWebsites: any[] = [];

  // Actions menu
  activeActionsMenu: string | null = null;

  // Add User Modal
  showAddUserModal = false;
  selectedAgentForAdd: any = null;

  // Success popup properties
  showUpdateSuccessPopup = false;
  updateSuccessMessage = "";
  private successPopupTimeout: any;

  constructor(
    private route: ActivatedRoute,
    private managerService: ManagerService,
    private branchService: BranchService,
    private headService: HeadService,
    private userStateService: UserStateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.currentRoleId = this.userStateService.getCurrentRoleId();
    this.loadbranchs(this.currentRoleId);
    this.loadWebsiteOptions(this.currentRoleId);
  }

  // ---------- LOAD BRANCHES ----------
  loadbranchs(headId: any): void {
    this.loading = true;
    this.error = "";

    this.branchService.getBranchWithHeadId(headId).subscribe({
      next: (res: any) => {
        const list = res || [];
        this.agents = list.map((agent: any) => {
          const email = this.extractEmail(agent);
          const mobile = this.extractMobile(agent);
          const info = agent.info || agent.additionalInfo || "";

          const websiteResponse = Array.isArray(agent.websiteResponse)
            ? agent.websiteResponse
            : [];

          const websitesWithRange = websiteResponse.map((w: any) => ({
            websiteId: w.websiteId ?? w.id ?? "",
            range: w.range ?? "",
            websiteDomain: w.websiteDomain ?? w.domain ?? "Unknown",
            active:
              typeof w.active === "boolean"
                ? w.active
                : typeof w.isActive === "boolean"
                  ? w.isActive
                  : true,
            topupPercentage: Number(w.topupPercentage) || 0,
            payoutPercentage: Number(w.payoutPercentage) || 0,
          }));

          return {
            ...agent,
            id: agent.id || agent.headId || "",
            name: agent.name || agent.Name || "Unnamed Branch",
            showAllWebsites: false,
            email: email,
            mobile: mobile,
            info: info,
            websitesWithRange: websitesWithRange,
            active:
              typeof agent.active === "boolean"
                ? agent.active
                : typeof agent.isActive === "boolean"
                  ? agent.isActive
                  : true,
            isVerified: agent.isVerified || false,
            lastUpdated: agent.updatedAt || agent.createdAt,
          } as Agent;
        });

        this.filteredAgents = [...this.agents];
        this.calculateStatistics();
        this.updatePagination();
        this.loading = false;
      },
      error: (err) => {
        console.error("Error loading branches:", err);
        this.error =
          err.error?.message || "Failed to load branches. Please try again.";
        this.agents = [];
        this.filteredAgents = [];
        this.updatePagination();
        this.loading = false;
      },
    });
  }

  // ---------- HELPER METHODS ----------
  private extractEmail(agent: any): string {
    const possibleFields = ["email"];
    for (const field of possibleFields) {
      if (
        agent[field] &&
        typeof agent[field] === "string" &&
        agent[field].trim()
      ) {
        return agent[field].trim();
      }
    }
    return "";
  }

  private extractMobile(agent: any): string {
    const possibleFields = ["mobile"];
    for (const field of possibleFields) {
      if (agent[field] && agent[field].toString().trim()) {
        return agent[field].toString().trim();
      }
    }
    return "";
  }

  private isValidEmail(email: string): boolean {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidMobile(mobile: string): boolean {
    if (!mobile) return true;
    const mobileRegex = /^[0-9]{10,15}$/;
    return mobileRegex.test(mobile);
  }

  // ---------- LOAD WEBSITE OPTIONS ----------
  loadWebsiteOptions(headId: any): void {
    this.loadingWebsites = true;
    this.headService.getAllHeadsWithWebsitesById(headId).subscribe({
      next: (res: any) => {
        const opts = res || [];
        this.websiteOptions = opts.map((w: any) => ({
          websiteId: w.websiteId ?? w.id ?? "",
          websiteDomain: w.websiteDomain ?? w.domain ?? "Unknown Website",
          active:
            typeof w.active === "boolean"
              ? w.active
              : typeof w.isActive === "boolean"
                ? w.isActive
                : true,
        }));
        this.loadingWebsites = false;
      },
      error: (err: any) => {
        console.error("Error loading websites:", err);
        this.websiteOptions = [];
        this.loadingWebsites = false;
      },
    });
  }

  // ---------- PAGINATION ----------
  getPageNumbers(): number[] {
    const totalPages = Math.ceil(this.filteredAgents.length / this.pageSize);
    const pages: number[] = [];
    let start = Math.max(1, this.page - 2);
    let end = Math.min(totalPages, start + 4);
    if (end - start < 4) {
      start = Math.max(1, end - 4);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(pageNum: number): void {
    this.page = pageNum;
    this.updatePagination();
  }

  updatePagination(): void {
    const start = (this.page - 1) * this.pageSize;
    this.paginatedAgents = this.filteredAgents.slice(
      start,
      start + this.pageSize,
    );
  }

  nextPage(): void {
    if (this.page * this.pageSize < this.filteredAgents.length) {
      this.page++;
      this.updatePagination();
    }
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.updatePagination();
    }
  }

  // ---------- FILTER BRANCHES ----------
  filterAgents(): void {
    if (!this.searchTerm) {
      this.filteredAgents = [...this.agents];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredAgents = this.agents.filter(
        (agent) =>
          (agent.name || "").toLowerCase().includes(term) ||
          (agent.email || "").toLowerCase().includes(term) ||
          (agent.mobile || "").includes(term) ||
          (agent.info || "").toLowerCase().includes(term) ||
          agent.websitesWithRange?.some((website) =>
            (website.websiteDomain || "").toLowerCase().includes(term),
          ) ||
          (agent.id || "").toLowerCase().includes(term),
      );
    }
    this.page = 1;
    this.updatePagination();
  }

  filterByStatus(status: string): void {
    this.statusFilter = status;
    if (status === "all") {
      this.filteredAgents = [...this.agents];
    } else if (status === "active") {
      this.filteredAgents = this.agents.filter((agent) => agent.active);
    } else if (status === "inactive") {
      this.filteredAgents = this.agents.filter((agent) => !agent.active);
    }
    this.page = 1;
    this.updatePagination();
  }

  // ---------- STATISTICS ----------
  calculateStatistics(): void {
    this.activeAgentsCount = this.agents.filter((agent) => agent.active).length;
    this.totalWebsitesCount = this.agents.reduce(
      (total, agent) => total + (agent.websitesWithRange?.length || 0),
      0,
    );
    const allPercentages = this.agents.flatMap(
      (agent) =>
        agent.websitesWithRange?.map((w) => w.topupPercentage || 0) || [],
    );
    if (allPercentages.length > 0) {
      this.avgTopupPercentage = parseFloat(
        (
          allPercentages.reduce((a, b) => a + b, 0) / allPercentages.length
        ).toFixed(1),
      );
    }
  }

  // ---------- WEBSITE HELPER METHODS ----------
  getWebsiteDomain(website: any): string {
    if (typeof website === "string") return website;
    return website?.websiteDomain || website?.domain || "Unknown";
  }

  getWebsiteProperty(website: any, property: string): any {
    if (!website) return 0;
    return website[property] || 0;
  }

  // ---------- MODAL METHODS ----------
  openWebsitePopup(agent: Agent, website: any): void {
    this.selectedAgent = agent;
    this.selectedWebsite = website;
    this.showSingleWebsiteModal = true;
  }

  closeSingleWebsiteModal(): void {
    this.showSingleWebsiteModal = false;
    this.selectedAgent = null;
    this.selectedWebsite = null;
  }

  openAllWebsitesPopup(agent: Agent): void {
    this.selectedAgent = agent;
    this.showAllWebsitesModal = true;
    this.websiteModalSearchTerm = "";
    this.filteredModalWebsites = agent.websitesWithRange || [];
  }

  closeAllWebsitesModal(): void {
    this.showAllWebsitesModal = false;
    this.selectedAgent = null;
    this.websiteModalSearchTerm = "";
    this.filteredModalWebsites = [];
  }

  filterWebsitesInModal(): void {
    if (!this.selectedAgent) return;
    const websites = this.selectedAgent.websitesWithRange || [];
    if (
      !this.websiteModalSearchTerm ||
      this.websiteModalSearchTerm.trim() === ""
    ) {
      this.filteredModalWebsites = [...websites];
    } else {
      const searchTerm = this.websiteModalSearchTerm.toLowerCase().trim();
      this.filteredModalWebsites = websites.filter((website: any) =>
        this.getWebsiteDomain(website).toLowerCase().includes(searchTerm),
      );
    }
  }

  // ---------- TOGGLE STATUS ----------
  toggleStatus(agent: Agent): void {
    const targetId = agent?.id || agent?.headId || this.currentRoleId;
    if (!targetId) {
      console.error("No agent id available to toggle status");
      return;
    }
    if (this.togglingAgent[targetId]) return;
    this.togglingAgent[targetId] = true;

    const prev = agent.active;
    agent.active = !agent.active;

    this.branchService.toggleChiefStatus(targetId).subscribe({
      next: () => {
        this.togglingAgent[targetId] = false;
      },
      error: (err) => {
        agent.active = prev;
        this.togglingAgent[targetId] = false;
        console.error("Failed to toggle status", err);
        alert("Failed to update branch status");
      },
    });
  }

  toggleWebsiteStatus(agent: Agent, website: WebsiteRange): void {
    if (!agent?.id || !website?.websiteId) {
      console.error("Missing agent id or website id for toggleWebsiteStatus");
      return;
    }

    const key = `${agent.id}_${website.websiteId}`;
    if (this.togglingWebsite[key]) return;
    this.togglingWebsite[key] = true;

    const prevState = website.active;
    website.active = !website.active;

    this.branchService
      .changeManagerWebsiteStatus(website.websiteId, agent.id)
      .subscribe({
        next: () => {
          this.togglingWebsite[key] = false;
        },
        error: (err) => {
          website.active = prevState;
          this.togglingWebsite[key] = false;
          console.error("Failed to toggle website status", err);
          alert("Failed to update website status. Please try again.");
        },
      });
  }

  isWebsiteToggling(agentId: string, websiteId: string): boolean {
    return !!this.togglingWebsite[`${agentId}_${websiteId}`];
  }

  // ---------- ACTIONS MENU ----------
  toggleActionsMenu(agentId: string): void {
    this.activeActionsMenu =
      this.activeActionsMenu === agentId ? null : agentId;
  }

  closeActionsMenu(): void {
    this.activeActionsMenu = null;
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest(".actions-menu-container")) {
      this.closeActionsMenu();
    }
  }

  // ---------- EDIT MODAL ----------
  openEditModal(agent: Agent): void {
    this.editForm = {
      id: agent.id,
      name: agent.name,
      email: agent.email || "",
      mobile: agent.mobile || "",
      info: agent.info || "",
      isActive: agent.active,
      websitesWithRange: (agent.websitesWithRange || []).map((w) => ({
        ...w,
        topupPercentage: Number(w.topupPercentage) || 0,
        payoutPercentage: Number(w.payoutPercentage) || 0,
      })),
    };
    this.selectedWebsitesForAdd = [];
    this.addWebsiteSearchTerm = "";
    this.assignedWebsiteSearch = "";
    this.emailError = "";
    this.mobileError = "";
    this.websitesForAdd = [];
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editForm = {
      id: "",
      name: "",
      email: "",
      mobile: "",
      info: "",
      isActive: true,
      websitesWithRange: [],
    };
    this.selectedWebsitesForAdd = [];
    this.addWebsiteSearchTerm = "";
    this.assignedWebsiteSearch = "";
    this.websitesForAdd = [];
  }

  toggleActiveState(): void {
    this.editForm.isActive = !this.editForm.isActive;
    this.cdr.detectChanges();
  }

  // ---------- WEBSITE MANAGEMENT IN MODAL (SEARCH-BASED) ----------
  isWebsiteAlreadyAssigned(websiteId: string): boolean {
    return this.editForm.websitesWithRange.some(
      (w) => w.websiteId === websiteId,
    );
  }

  isWebsiteSelectedForAdd(websiteId: string): boolean {
    return this.selectedWebsitesForAdd.includes(websiteId);
  }

  filterWebsitesForAdd(): void {
    const term = (this.addWebsiteSearchTerm || "").trim().toLowerCase();
    if (!term) {
      this.websitesForAdd = [];
    } else {
      this.websitesForAdd = this.websiteOptions.filter(
        (website) =>
          (website.websiteDomain || "").toLowerCase().includes(term) &&
          !this.isWebsiteAlreadyAssigned(website.websiteId),
      );
    }
    this.cdr.detectChanges();
  }

  getFilteredAssignedWebsites(): WebsiteRange[] {
    if (
      !this.assignedWebsiteSearch ||
      this.assignedWebsiteSearch.trim() === ""
    ) {
      return this.editForm.websitesWithRange;
    }
    const searchTerm = this.assignedWebsiteSearch.toLowerCase().trim();
    return this.editForm.websitesWithRange.filter((website) =>
      website.websiteDomain.toLowerCase().includes(searchTerm),
    );
  }

  clearAssignedWebsiteSearch(): void {
    this.assignedWebsiteSearch = "";
    this.cdr.detectChanges();
  }

  clearAddWebsiteSearch(): void {
    this.addWebsiteSearchTerm = "";
    this.websitesForAdd = [];
    this.cdr.detectChanges();
  }

  toggleWebsiteForAdd(websiteId: string): void {
    const index = this.selectedWebsitesForAdd.indexOf(websiteId);
    if (index > -1) {
      this.selectedWebsitesForAdd.splice(index, 1);
    } else {
      this.selectedWebsitesForAdd.push(websiteId);
    }
    this.cdr.detectChanges();
  }

  addSelectedWebsites(): void {
    this.selectedWebsitesForAdd.forEach((websiteId) => {
      const website = this.websiteOptions.find(
        (w) => w.websiteId === websiteId,
      );
      if (website && !this.isWebsiteAlreadyAssigned(websiteId)) {
        const newWebsite: WebsiteRange = {
          websiteId: website.websiteId,
          websiteDomain: website.websiteDomain,
          range: "",
          topupPercentage: 0,
          payoutPercentage: 0,
          active: true,
        };
        this.editForm.websitesWithRange.push(newWebsite);
      }
    });
    this.selectedWebsitesForAdd = [];
    this.addWebsiteSearchTerm = "";
    this.websitesForAdd = [];
    this.cdr.detectChanges();
  }

  removeWebsiteFromEdit(index: number): void {
    if (index >= 0 && index < this.editForm.websitesWithRange.length) {
      this.editForm.websitesWithRange.splice(index, 1);
      if (this.addWebsiteSearchTerm) {
        this.filterWebsitesForAdd();
      } else {
        this.websitesForAdd = [];
      }
      this.cdr.detectChanges();
    }
  }

  // ---------- VALIDATION ----------
  validateEmail(): void {
    if (!this.editForm.email) {
      this.emailError = "";
      return;
    }
    if (!this.isValidEmail(this.editForm.email)) {
      this.emailError = "Please enter a valid email address";
    } else {
      this.emailError = "";
    }
    this.cdr.detectChanges();
  }

  validateMobile(): void {
    if (!this.editForm.mobile) {
      this.mobileError = "";
      return;
    }
    const cleanMobile = this.editForm.mobile.replace(/\D/g, "");
    if (!this.isValidMobile(cleanMobile)) {
      this.mobileError = "Please enter a valid 10-15 digit mobile number";
    } else {
      this.mobileError = "";
    }
    this.editForm.mobile = cleanMobile;
    this.cdr.detectChanges();
  }

  isWebsiteValid(website: any): boolean {
    return (
      website.topupPercentage !== null &&
      website.topupPercentage !== undefined &&
      website.payoutPercentage !== null &&
      website.payoutPercentage !== undefined &&
      website.topupPercentage >= 0 &&
      website.topupPercentage <= 100 &&
      website.payoutPercentage >= 0 &&
      website.payoutPercentage <= 100
    );
  }

  isFormValid(): boolean {
    if (!this.editForm.name || this.editForm.name.trim() === "") {
      return false;
    }
    if (this.editForm.email && this.editForm.email.trim() !== "") {
      if (!this.isValidEmail(this.editForm.email)) {
        return false;
      }
    }
    if (this.editForm.mobile && this.editForm.mobile.trim() !== "") {
      const cleanMobile = this.editForm.mobile.replace(/\D/g, "");
      if (!this.isValidMobile(cleanMobile)) {
        return false;
      }
    }
    for (const website of this.editForm.websitesWithRange) {
      if (!this.isWebsiteValid(website)) {
        return false;
      }
    }
    return true;
  }

  validateWebsitePercentages(): boolean {
    for (const website of this.editForm.websitesWithRange) {
      const topup = Number(website.topupPercentage);
      const payout = Number(website.payoutPercentage);
      if (isNaN(topup) || topup < 0 || topup > 100) {
        return false;
      }
      if (isNaN(payout) || payout < 0 || payout > 100) {
        return false;
      }
    }
    return true;
  }

  // ---------- PERCENTAGE HANDLING ----------
  onPercentageChange(website: any, field: string, event: any): void {
    const value = event.target.value;
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      website[field] = numValue;
    } else if (value === "") {
      website[field] = 0;
    } else {
      event.target.value = website[field] || 0;
    }
    this.cdr.detectChanges();
  }

  incrementPercentage(website: any, field: string): void {
    const currentValue = website[field] || 0;
    if (currentValue < 100) {
      website[field] = currentValue + 1;
    }
    this.cdr.detectChanges();
  }

  decrementPercentage(website: any, field: string): void {
    const currentValue = website[field] || 0;
    if (currentValue > 0) {
      website[field] = currentValue - 1;
    }
    this.cdr.detectChanges();
  }

  // ---------- UPDATE BRANCH (with success popup) ----------
  updateBranch(): void {
    this.emailError = "";
    this.mobileError = "";

    if (!this.editForm.name || this.editForm.name.trim() === "") {
      alert("Branch name is required");
      return;
    }

    if (this.editForm.email && this.editForm.email.trim() !== "") {
      if (!this.isValidEmail(this.editForm.email)) {
        this.emailError = "Please enter a valid email address";
        alert(this.emailError);
        return;
      }
    }

    if (this.editForm.mobile && this.editForm.mobile.trim() !== "") {
      const cleanMobile = this.editForm.mobile.replace(/\D/g, "");
      if (!this.isValidMobile(cleanMobile)) {
        this.mobileError = "Please enter a valid 10-15 digit mobile number";
        alert(this.mobileError);
        return;
      }
      this.editForm.mobile = cleanMobile;
    }

    if (!this.validateWebsitePercentages()) {
      alert("Please enter valid percentages (0-100) for all websites");
      return;
    }

    this.loading = true;

    const websitePercentages: any = {};
    this.editForm.websitesWithRange.forEach((website) => {
      websitePercentages[website.websiteId] = {
        topupPercentage: Number(website.topupPercentage) || 0,
        payoutPercentage: Number(website.payoutPercentage) || 0,
      };
    });

    const websiteIds: string[] = this.editForm.websitesWithRange
      .map((w) => w.websiteId)
      .filter((id) => !!id);

    const payload = {
      id: this.editForm.id,
      name: this.editForm.name.trim(),
      email: this.editForm.email.trim() || null,
      mobile: this.editForm.mobile || null,
      info: this.editForm.info?.trim() || null, // ✅ info added
      isActive: this.editForm.isActive,
      createdById: this.currentRoleId,
      websites: websiteIds,
      websitePercentages: websitePercentages,
    };

    console.log("Update payload:", payload);

    this.branchService.updateBranch(payload).subscribe({
      next: (res: any) => {
        console.log("Update successful:", res);
        this.loadbranchs(this.currentRoleId);
        this.closeEditModal();
        this.loading = false;

        this.updateSuccessMessage = "Branch updated successfully!";
        this.showUpdateSuccessPopup = true;
        this.successPopupTimeout = setTimeout(() => {
          this.closeUpdateSuccessPopup();
        }, 3000);
      },
      error: (err) => {
        console.error("Failed to update branch:", err);
        this.error =
          err.error?.message || "Failed to update branch. Please try again.";
        alert(this.error);
        this.loading = false;
      },
    });
  }

  closeUpdateSuccessPopup(): void {
    clearTimeout(this.successPopupTimeout);
    this.showUpdateSuccessPopup = false;
    this.updateSuccessMessage = "";
  }

  // ---------- ADD USER MODAL ----------
  openAddUserModal(agent: Agent): void {
    this.selectedAgentForAdd = agent;
    this.showAddUserModal = true;
  }

  closeAddUserModal(): void {
    this.showAddUserModal = false;
    this.selectedAgentForAdd = null;
  }

  handleUserCreated(payload: any): void {
    this.closeAddUserModal();
  }

  // ---------- TOGGLE WEBSITE VIEW ----------
  toggleWebsiteView(agent: Agent): void {
    agent.showAllWebsites = !agent.showAllWebsites;
  }

  // ---------- EXPORT ----------
  exportToCSV(): void {
    const csvContent = this.convertToCSV(this.filteredAgents);
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `branches-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  convertToCSV(agents: Agent[]): string {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Info",
      "Status",
      "Websites",
      "Avg Topup %",
      "Avg Payout %",
    ];
    const rows = agents.map((agent) => {
      const avgTopup =
        agent.websitesWithRange?.reduce(
          (sum, w) => sum + (w.topupPercentage || 0),
          0,
        ) / (agent.websitesWithRange?.length || 1);
      const avgPayout =
        agent.websitesWithRange?.reduce(
          (sum, w) => sum + (w.payoutPercentage || 0),
          0,
        ) / (agent.websitesWithRange?.length || 1);
      return [
        agent.name || "",
        agent.email || "",
        agent.mobile || "",
        agent.info || "",
        agent.active ? "Active" : "Inactive",
        agent.websitesWithRange?.length || 0,
        avgTopup.toFixed(1),
        avgPayout.toFixed(1),
      ].join(",");
    });
    return [headers.join(","), ...rows].join("\n");
  }

  getTotalWebsitesCount(): number {
    return this.editForm.websitesWithRange?.length || 0;
  }

  // ---------- UNUSED METHODS (kept for compatibility) ----------
  filterWebsites(): void {}
  isWebsiteSelected(websiteId: string): boolean {
    return false;
  }
  toggleWebsite(websiteId: string, event?: Event): void {}
  addWebsite(websiteId: string): void {}
  removeNewWebsite(index: any): void {}
  getWebsiteName(websiteId: string): string {
    const website = this.websiteOptions.find((w) => w.websiteId === websiteId);
    return website ? website.websiteDomain : "Unknown Website";
  }
  getFilteredWebsites(): any[] {
    return [];
  }
}
