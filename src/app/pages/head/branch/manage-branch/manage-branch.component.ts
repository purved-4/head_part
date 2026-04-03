import {
  Component,
  OnInit,
  HostListener,
  ChangeDetectorRef,
  OnDestroy,
} from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ManagerService } from "../../../services/manager.service";
import { BranchService } from "../../../services/branch.service";
import { HeadService } from "../../../services/head.service";
import { UserStateService } from "../../../../store/user-state.service";
import { SnackbarService } from "../../../../common/snackbar/snackbar.service";
import { COUNTRY_CODES } from "../../../../utils/constants";
interface PortalRange {
  portalId: string;
  range: string;
  portalDomain: string;
  active?: boolean;
  topupPercentage: number;
  payoutPercentage: number;
  fttPercentage?: number;
}

interface Agent {
  id: string;
  name: string;
  headId: string;
  email?: string;
  mobile?: string;
  info?: string;
  portalsWithRange: PortalRange[];
  active: boolean;
  isActive?: boolean;
  showAllPortals?: boolean;
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
  portalsWithRange: PortalRange[];
}

interface Portal {
  portalId: string;
  portalDomain: string;
  active?: boolean;
}

@Component({
  selector: "app-manage-branch",
  templateUrl: "./manage-branch.component.html",
})
export class ManageBranchComponent implements OnInit, OnDestroy {
  agents: Agent[] = [];
  filteredAgents: Agent[] = [];
  paginatedAgents: any[] = [];

  page = 1;
  pageSize = 6;
  searchTerm = "";
  updatingbranch: boolean = false;

  loading = true;
  error = "";
  currentUser!: string;

  // route / context ids
  headId: string = "";
  userId: string = "";
  routeUserId: string = "";
  currentRoleId: any;
  isMobile = false;
  // Edit Modal Properties
  showEditModal = false;
  editForm: EditForm = {
    id: "",
    name: "",
    email: "",
    mobile: "",
    info: "",
    isActive: true,
    portalsWithRange: [],
  };

  // Portal Selection Properties (for edit modal)
  portalOptions: Portal[] = [];
  filteredPortals: Portal[] = []; // not used in search-based version, kept for compatibility
  portalsForAdd: Portal[] = [];
  addPortalSearchTerm: string = "";
  assignedPortalSearch: string = "";
  selectedPortalsForAdd: string[] = [];
  loadingPortals = false;

  // Validation errors
  emailError: string = "";
  mobileError: string = "";

  // toggles-in-flight
  togglingPortal: Record<string, boolean> = {};
  togglingAgent: Record<string, boolean> = {};

  // Helper for template
  Math = Math;

  // Statistics
  activeAgentsCount = 0;
  totalPortalsCount = 0;
  avgTopupPercentage = 0;
  statusFilter: any;
  isEditMode: boolean = false;
  // Portal Modal Properties
  showSinglePortalModal = false;
  showAllPortalsModal = false;
  selectedAgent: Agent | null = null;
  selectedPortal: any = null;
  portalModalSearchTerm: string = "";
  filteredModalPortals: any[] = [];

  // Actions menu
  activeActionsMenu: string | null = null;

  // Add User Modal
  showAddUserModal = false;
  selectedAgentForAdd: any = null;

  // Success popup properties
  showUpdateSuccessPopup = false;
  updateSuccessMessage = "";
  private successPopupTimeout: any;

  // Properties for Limit Popup
  showLimitPopup = false;
  selectedBranchForLimit: { id: string; type: string } | null = null;

  // Add these properties
  showInfoModal = false;
  selectedAgentForInfo: any = null;
  viewMode: "grid" | "table" = "table";
  countryCodes = COUNTRY_CODES;
  // selectedCountry = COUNTRY_CODES.find(c => c.code === 'IN') || COUNTRY_CODES[0];
  selectedCountry: any = null;
  constructor(
    private route: ActivatedRoute,
    private managerService: ManagerService,
    private branchService: BranchService,
    private headService: HeadService,
    private userStateService: UserStateService,
    private cdr: ChangeDetectorRef,
    private snack: SnackbarService,
  ) {}
  ngOnDestroy(): void {
    sessionStorage.removeItem("branchViewMode");
  }

  ngOnInit(): void {
    this.currentRoleId = this.userStateService.getCurrentEntityId();
    this.loadbranchs(this.currentRoleId);
    this.loadPortalOptions(this.currentRoleId);

    const savedMode = sessionStorage.getItem("branchViewMode") as
      | "grid"
      | "table";
    this.viewMode = savedMode || "table";
  }

  // Add this method to get view mode based on device
  getViewMode(): "grid" | "table" {
    // For mobile, always return grid
    if (this.isMobile) {
      return "grid";
    }

    // For desktop, return saved preference or default to table
    const savedMode = sessionStorage.getItem("branchViewMode") as
      | "grid"
      | "table";
    return savedMode || "table";
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

          const portalResponse = Array.isArray(agent.portalResponse)
            ? agent.portalResponse
            : [];

          const portalsWithRange = portalResponse.map((w: any) => ({
            portalId: w.portalId ?? w.id ?? "",
            range: w.range ?? "",
            portalDomain: w.portalDomain ?? w.domain ?? "Unknown",
            active:
              typeof w.active === "boolean"
                ? w.active
                : typeof w.isActive === "boolean"
                  ? w.isActive
                  : true,
            fttPercentage: Number(w.fttPercentage) || 0,
            topupPercentage: Number(w.topupPercentage) || 0,
            payoutPercentage: Number(w.payoutPercentage) || 0,
          }));

          return {
            ...agent,
            id: agent.id || agent.headId || "",
            name: agent.name || agent.Name || "Unnamed Branch",
            showAllPortals: false,
            email: email,
            mobile: mobile,
            info: info,
            portalsWithRange: portalsWithRange,
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
        this.error =
          err.error?.message || "Failed to load branches. Please try again.";
        this.agents = [];
        this.filteredAgents = [];
        this.updatePagination();
        this.loading = false;
        this.snack.show(this.error, false);
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
          agent.portalsWithRange?.some((portal) =>
            (portal.portalDomain || "").toLowerCase().includes(term),
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
    this.totalPortalsCount = this.agents.reduce(
      (total, agent) => total + (agent.portalsWithRange?.length || 0),
      0,
    );
    const allPercentages = this.agents.flatMap(
      (agent) =>
        agent.portalsWithRange?.map((w) => w.topupPercentage || 0) || [],
    );
    if (allPercentages.length > 0) {
      this.avgTopupPercentage = parseFloat(
        (
          allPercentages.reduce((a, b) => a + b, 0) / allPercentages.length
        ).toFixed(1),
      );
    }
  }

  // ---------- PORTAL HELPER METHODS ----------
  getPortalDomain(portal: any): string {
    if (typeof portal === "string") return portal;
    return portal?.portalDomain || portal?.domain || "Unknown";
  }

  getPortalProperty(portal: any, property: string): any {
    if (!portal) return 0;
    return portal[property] || 0;
  }

  // ---------- MODAL METHODS ----------
  openPortalPopup(agent: Agent, portal: any): void {
    this.selectedAgent = agent;

    // set initial data first
    this.selectedPortal = {
      ...portal,
      fttPercentage: Number(portal?.fttPercentage) || 0,
      topupPercentage: Number(portal?.topupPercentage) || 0,
      payoutPercentage: Number(portal?.payoutPercentage) || 0,
    };

    this.showSinglePortalModal = true;

    this.branchService.getBranchPortalPercentage(agent.id).subscribe({
      next: (res: any) => {
        const percentages = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];

        const matched = percentages.find(
          (p: any) =>
            p.portalId === portal.portalId ||
            p.portalName === portal.portalDomain,
        );

        if (matched) {
          this.selectedPortal = {
            ...this.selectedPortal,
            fttPercentage: Number(matched.fttPercentage) || 0,
            topupPercentage: Number(matched.topupPercentage) || 0,
            payoutPercentage: Number(matched.payoutPercentage) || 0,
          };
        }

        this.cdr.detectChanges();
      },
      error: (err) => {},
    });
  }

  closeSinglePortalModal(): void {
    this.showSinglePortalModal = false;
    this.selectedAgent = null;
    this.selectedPortal = null;
  }

  openAllPortalsPopup(agent: Agent): void {
    this.selectedAgent = agent;
    this.showAllPortalsModal = true;
    this.portalModalSearchTerm = "";

    // show current values first
    this.filteredModalPortals = (agent.portalsWithRange || []).map(
      (portal) => ({
        ...portal,
        fttPercentage: Number(portal.fttPercentage) || 0,
        topupPercentage: Number(portal.topupPercentage) || 0,
        payoutPercentage: Number(portal.payoutPercentage) || 0,
      }),
    );

    this.branchService.getBranchPortalPercentage(agent.id).subscribe({
      next: (res: any) => {
        const percentages = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];

        const updatedPortals = (agent.portalsWithRange || []).map((portal) => {
          const matched = percentages.find(
            (p: any) =>
              p.portalId === portal.portalId ||
              p.portalName === portal.portalDomain,
          );

          return {
            ...portal,
            fttPercentage: Number(matched?.fttPercentage) || 0,
            topupPercentage: Number(matched?.topupPercentage) || 0,
            payoutPercentage: Number(matched?.payoutPercentage) || 0,
          };
        });

        this.filteredModalPortals = updatedPortals;

        // optional: also update selectedAgent data so modal search uses latest values
        if (this.selectedAgent) {
          this.selectedAgent = {
            ...this.selectedAgent,
            portalsWithRange: updatedPortals,
          };
        }

        this.cdr.detectChanges();
      },
      error: (err) => {},
    });
  }

  closeAllPortalsModal(): void {
    this.showAllPortalsModal = false;
    this.selectedAgent = null;
    this.portalModalSearchTerm = "";
    this.filteredModalPortals = [];
  }

  filterPortalsInModal(): void {
    if (!this.selectedAgent) return;
    const portals = this.selectedAgent.portalsWithRange || [];
    if (
      !this.portalModalSearchTerm ||
      this.portalModalSearchTerm.trim() === ""
    ) {
      this.filteredModalPortals = [...portals];
    } else {
      const searchTerm = this.portalModalSearchTerm.toLowerCase().trim();
      this.filteredModalPortals = portals.filter((portal: any) =>
        this.getPortalDomain(portal).toLowerCase().includes(searchTerm),
      );
    }
  }

  // ---------- TOGGLE STATUS ----------
  toggleStatus(agent: Agent): void {
    const targetId = agent?.id || agent?.headId || this.currentRoleId;
    if (!targetId) {
      return;
    }
    if (this.togglingAgent[targetId]) return;
    this.togglingAgent[targetId] = true;

    const prev = agent.active;
    agent.active = !agent.active;

    this.branchService.toggleChiefStatus(targetId).subscribe({
      next: () => {
        this.togglingAgent[targetId] = false;
        this.snack.show(
          `Branch ${agent.active ? "activated" : "deactivated"} successfully`,
          true,
        );
      },
      error: (err) => {
        agent.active = prev;
        this.togglingAgent[targetId] = false;
        this.snack.show(
          err?.error?.message || "Failed to update branch status",
          false,
        );

        this.snack.show("Failed to update branch status", false);
      },
    });
  }

  togglePortalStatus(agent: Agent, portal: PortalRange): void {
    if (!agent?.id || !portal?.portalId) return;

    const key = `${agent.id}_${portal.portalId}`;
    if (this.togglingPortal[key]) return;
    this.togglingPortal[key] = true;

    const prevState = portal.active;
    portal.active = !portal.active;

    this.snack.show("Updating portal status...", "warning", 1500);

    this.branchService
      .changeManagerPortalStatus(portal.portalId, agent.id)
      .subscribe({
        next: () => {
          this.togglingPortal[key] = false;
          this.snack.show(
            `Portal ${portal.active ? "enabled" : "disabled"} successfully`,
            true,
          );
        },
        error: (err) => {
          portal.active = prevState;
          this.togglingPortal[key] = false;
          this.snack.show(
            err?.error?.message || "Failed to update portal status",
            false,
          );
        },
      });
  }

  isPortalToggling(agentId: string, portalId: string): boolean {
    return !!this.togglingPortal[`${agentId}_${portalId}`];
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

  closeEditModal(): void {
    this.showEditModal = false;

    this.editForm = {
      id: "",
      name: "",
      email: "",
      mobile: "",
      info: "",
      isActive: true,
      portalsWithRange: [],
    };
    this.selectedCountry = null;
    this.selectedPortalsForAdd = [];
    this.addPortalSearchTerm = "";
    this.assignedPortalSearch = "";
    this.portalsForAdd = [];
    this.isEditMode = false;
  }

  toggleActiveState(): void {
    this.editForm.isActive = !this.editForm.isActive;
    this.cdr.detectChanges();
  }

  // ---------- PORTAL MANAGEMENT IN MODAL (SEARCH-BASED) ----------
  isPortalAlreadyAssigned(portalId: string): boolean {
    return this.editForm.portalsWithRange.some((w) => w.portalId === portalId);
  }

  // isPortalSelectedForAdd(portalId: string): boolean {
  //   return this.selectedPortalsForAdd.includes(portalId);
  // }

  filterPortalsForAdd(): void {
    const term = (this.addPortalSearchTerm || "").trim().toLowerCase();
    if (!term) {
      this.portalsForAdd = [];
    } else {
      this.portalsForAdd = this.portalOptions.filter(
        (portal) =>
          (portal.portalDomain || "").toLowerCase().includes(term) &&
          !this.isPortalAlreadyAssigned(portal.portalId),
      );
    }
    this.cdr.detectChanges();
  }

  getFilteredAssignedPortals(): PortalRange[] {
    if (!this.assignedPortalSearch || this.assignedPortalSearch.trim() === "") {
      return this.editForm.portalsWithRange;
    }
    const searchTerm = this.assignedPortalSearch.toLowerCase().trim();
    return this.editForm.portalsWithRange.filter((portal) =>
      portal.portalDomain.toLowerCase().includes(searchTerm),
    );
  }

  clearAssignedPortalSearch(): void {
    this.assignedPortalSearch = "";
    this.cdr.detectChanges();
  }

  clearAddPortalSearch(): void {
    this.addPortalSearchTerm = "";
    this.portalsForAdd = [];
    this.cdr.detectChanges();
  }

  togglePortalForAdd(portalId: string): void {
    const index = this.selectedPortalsForAdd.indexOf(portalId);
    if (index > -1) {
      this.selectedPortalsForAdd.splice(index, 1);
    } else {
      this.selectedPortalsForAdd.push(portalId);
    }
    this.cdr.detectChanges();
  }

  addSelectedPortals(): void {
    this.selectedPortalsForAdd.forEach((portalId) => {
      const portal = this.portalOptions.find((w) => w.portalId === portalId);
      if (portal && !this.isPortalAlreadyAssigned(portalId)) {
        const newPortal: PortalRange = {
          portalId: portal.portalId,
          portalDomain: portal.portalDomain,
          range: "",
          fttPercentage: 0,

          topupPercentage: 0,
          payoutPercentage: 0,
          active: true,
        };
        this.editForm.portalsWithRange.push(newPortal);
      }
    });
    this.selectedPortalsForAdd = [];
    this.addPortalSearchTerm = "";
    this.portalsForAdd = [];
    this.cdr.detectChanges();
    this.snack.show("Portals added successfully", true);
  }

  removePortalFromEdit(index: number): void {
    if (index >= 0 && index < this.editForm.portalsWithRange.length) {
      this.editForm.portalsWithRange.splice(index, 1);
      if (this.addPortalSearchTerm) {
        this.filterPortalsForAdd();
      } else {
        this.portalsForAdd = [];
      }
      this.cdr.detectChanges();
    }
    this.snack.show("Portal removed", "warning", 1500);
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

  isPortalValid(portal: any): boolean {
    return (
      portal.fttPercentage !== null &&
      portal.fttPercentage !== undefined &&
      portal.topupPercentage !== null &&
      portal.topupPercentage !== undefined &&
      portal.payoutPercentage !== null &&
      portal.payoutPercentage !== undefined &&
      portal.fttPercentage >= 0 &&
      portal.fttPercentage <= 100 &&
      portal.topupPercentage >= 0 &&
      portal.topupPercentage <= 100 &&
      portal.payoutPercentage >= 0 &&
      portal.payoutPercentage <= 100
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
    for (const portal of this.editForm.portalsWithRange) {
      if (!this.isPortalValid(portal)) {
        return false;
      }
    }
    return true;
  }

  validatePortalPercentages(): boolean {
    for (const portal of this.editForm.portalsWithRange) {
      const ftt = Number(portal.fttPercentage);

      const topup = Number(portal.topupPercentage);
      const payout = Number(portal.payoutPercentage);
      if (isNaN(ftt) || ftt < 0 || ftt > 100) {
        return false;
      }
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
  onPercentageChange(portal: any, field: string, event: any): void {
    const value = event.target.value;
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
      portal[field] = numValue;
    } else if (value === "") {
      portal[field] = 0;
    } else {
      event.target.value = portal[field] || 0;
    }
    this.cdr.detectChanges();
  }

  incrementPercentage(portal: any, field: string): void {
    const currentValue = portal[field] || 0;
    if (currentValue < 100) {
      portal[field] = currentValue + 1;
    }
    this.cdr.detectChanges();
  }

  decrementPercentage(portal: any, field: string): void {
    const currentValue = portal[field] || 0;
    if (currentValue > 0) {
      portal[field] = currentValue - 1;
    }
    this.cdr.detectChanges();
  }
  // Open limit popup
  openLimitPopup(branch: Agent): void {
    //
    const branchType = (branch as any).type || "BRANCH";
    this.selectedBranchForLimit = { id: branch.id, type: branchType };
    this.showLimitPopup = true;
    this.closeActionsMenu();
  }

  // Close limit popup
  closeLimitPopup(): void {
    // console.log("closeLimitPopup called"); // debug ke liye
    this.showLimitPopup = false;
    this.selectedBranchForLimit = null;
    this.cdr.detectChanges(); // UI update force
  }

  updateBranch(): void {
    this.emailError = "";
    this.mobileError = "";

    // ---------- VALIDATION ----------
    if (!this.editForm.name || this.editForm.name.trim() === "") {
      this.snack.show("Branch name is required", "warning");
      return;
    }

    if (this.editForm.email && this.editForm.email.trim() !== "") {
      if (!this.isValidEmail(this.editForm.email)) {
        this.emailError = "Please enter a valid email address";
        this.snack.show(this.emailError, "warning");
        return;
      }
    }

    if (this.editForm.mobile && this.editForm.mobile.trim() !== "") {
      const cleanMobile = this.editForm.mobile.replace(/\D/g, "");
      if (!this.isValidMobile(cleanMobile)) {
        this.mobileError = "Please enter a valid 10-15 digit mobile number";
        this.snack.show(this.mobileError, "warning");
        return;
      }
      this.editForm.mobile = cleanMobile;
    }

    if (!this.validatePortalPercentages()) {
      this.snack.show(
        "Enter valid percentages (0-100) for all portals",
        "warning",
      );
      return;
    }

    // ---------- LOADING ----------
    this.updatingbranch = true;
    this.loading = true;

    this.snack.show("Updating branch...", "warning", 1200);

    // ---------- BUILD PAYLOAD ----------
    const portalPercentages: any = {};
    this.editForm.portalsWithRange.forEach((portal) => {
      portalPercentages[portal.portalId] = {
        fttPercentage: Number(portal.fttPercentage) || 0,
        topupPercentage: Number(portal.topupPercentage) || 0,
        payoutPercentage: Number(portal.payoutPercentage) || 0,
      };
    });

    const portalIds: string[] = this.editForm.portalsWithRange
      .map((w) => w.portalId)
      .filter((id) => !!id);

    const payload = {
      id: this.editForm.id,
      name: this.editForm.name.trim(),
      email: this.editForm.email.trim() || null,
      // mobile: this.editForm.mobile || null,
      // mobile: this.selectedCountry.dialCode + this.editForm.mobile,
      mobile: this.editForm.mobile
        ? `${this.selectedCountry?.dialCode || ""}${this.editForm.mobile}`
        : null,

      info: this.editForm.info?.trim() || null,
      isActive: this.editForm.isActive,
      createdById: this.currentRoleId,
      portals: portalIds,
      portalPercentages: portalPercentages,
    };

    // ---------- API CALL ----------
    this.branchService.updateBranch(payload).subscribe({
      next: () => {
        this.loadbranchs(this.currentRoleId);
        this.closeEditModal();

        this.updatingbranch = false;
        this.loading = false;

        this.snack.show("Branch updated successfully", true);

        // Optional popup (keep if you want animation)
        this.updateSuccessMessage = "Branch updated successfully!";
        this.showUpdateSuccessPopup = true;
        this.successPopupTimeout = setTimeout(() => {
          this.closeUpdateSuccessPopup();
        }, 3000);
      },

      error: (err) => {
        this.updatingbranch = false;
        this.loading = false;

        this.error = err?.error?.message || "Failed to update branch";
        this.snack.show(this.error, false);
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

  // ---------- TOGGLE PORTAL VIEW ----------
  togglePortalView(agent: Agent): void {
    agent.showAllPortals = !agent.showAllPortals;
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
      "Portals",
      "Avg Ftt %",
      "Avg Topup %",
      "Avg Payout %",
    ];
    const rows = agents.map((agent) => {
      const avgFtt =
        agent.portalsWithRange?.reduce(
          (sum, w) => sum + (w.fttPercentage || 0),
          0,
        ) / (agent.portalsWithRange?.length || 1);
      const avgTopup =
        agent.portalsWithRange?.reduce(
          (sum, w) => sum + (w.topupPercentage || 0),
          0,
        ) / (agent.portalsWithRange?.length || 1);
      const avgPayout =
        agent.portalsWithRange?.reduce(
          (sum, w) => sum + (w.payoutPercentage || 0),
          0,
        ) / (agent.portalsWithRange?.length || 1);
      return [
        agent.name || "",
        agent.email || "",
        agent.mobile || "",
        agent.info || "",
        agent.active ? "Active" : "Inactive",
        agent.portalsWithRange?.length || 0,
        avgFtt.toFixed(1),
        avgTopup.toFixed(1),
        avgPayout.toFixed(1),
      ].join(",");
    });
    return [headers.join(","), ...rows].join("\n");
  }

  getTotalPortalsCount(): number {
    return this.editForm.portalsWithRange?.length || 0;
  }

  // ---------- UNUSED METHODS (kept for compatibility) ----------
  filterPortals(): void {}
  // isPortalSelected(portalId: string): boolean {
  //   return false;
  // }
  togglePortal(portalId: string, event?: Event): void {}
  addPortal(portalId: string): void {}
  removeNewPortal(index: any): void {}
  getPortalName(portalId: string): string {
    const portal = this.portalOptions.find((w) => w.portalId === portalId);
    return portal ? portal.portalDomain : "Unknown Portal";
  }
  getFilteredPortals(): any[] {
    return [];
  }

  // Update setViewMode to respect mobile constraint
  // setViewMode(mode: "grid" | "table"): void {
  //   if (this.isMobile && mode === "table") {
  //     return;
  //   }
  //   this.viewMode = mode;
  //   if (!this.isMobile) {
  //     sessionStorage.setItem("branchViewMode", mode);
  //   }
  // }
  setViewMode(mode: "grid" | "table"): void {
    this.viewMode = mode;
    sessionStorage.setItem("branchViewMode", mode);
  }

  openInfoModal(agent: any): void {
    this.selectedAgentForInfo = agent;
    this.showInfoModal = true;
  }

  closeInfoModal(): void {
    this.showInfoModal = false;
    this.selectedAgentForInfo = null;
  }

  closeAllActionMenus(): void {
    this.activeActionsMenu = null;
  }

  toggleActionMenu(agentId: string): void {
    this.activeActionsMenu =
      this.activeActionsMenu === agentId ? null : agentId;
  }

  initialLetter(agent: any): string {
    if (!agent?.name) return "";
    return agent.name.charAt(0).toUpperCase();
  }

  getActiveCount(): number {
    return this.agents.filter((a) => a.active).length;
  }

  getInactiveCount(): number {
    return this.agents.filter((a) => !a.active).length;
  }

  dismissError(): void {
    this.error = "";
  }

  // Add these methods to your component

  // For portal pagination in edit modal
  portalPage = 0;
  portalTotalPages = 0;
  loadingMorePortals = false;
  initialPortalIds: string[] = [];

  // Add this method to get portals for edit modal
  getSelectedPortalsForEdit(): any[] {
    return this.portalOptions;
  }

  // Add this method to check if a portal is selected
  isPortalSelected(portalId: string): boolean {
    return this.editForm.portalsWithRange.some((w) => w.portalId === portalId);
  }

  // Add this method to check if a portal was initially assigned
  isInitialPortal(portalId: string): boolean {
    return this.initialPortalIds.includes(portalId);
  }

  // Add this method to handle portal selection changes
  onPortalSelectionChange(event: any, portalId: string): void {
    const isChecked = event.target.checked;

    if (isChecked) {
      // Add portal
      const portal = this.portalOptions.find((w) => w.portalId === portalId);
      if (portal && !this.isPortalAlreadyAssigned(portalId)) {
        const newPortal: PortalRange = {
          portalId: portal.portalId,
          portalDomain: portal.portalDomain,
          range: "",
          topupPercentage: 0,
          payoutPercentage: 0,
          fttPercentage: 0,
          active: true,
        };
        this.editForm.portalsWithRange.push(newPortal);
      }
    } else {
      // Remove portal (only if not initial)
      if (!this.isInitialPortal(portalId)) {
        this.editForm.portalsWithRange = this.editForm.portalsWithRange.filter(
          (w) => w.portalId !== portalId,
        );
      } else {
        // Re-check for initial portals
        event.target.checked = true;
      }
    }
    this.cdr.detectChanges();
  }

  // Add this method to load more portals
  loadMorePortalsForEdit(): void {
    if (this.portalPage + 1 >= this.portalTotalPages) return;
    this.portalPage++;
    this.loadingMorePortals = true;
    // You'll need to implement this method based on your API
    this.loadPortalsForEdit(false);
  }

  // Add this method to load portals for edit (if not already present)
  loadPortalsForEdit(reset: boolean = true): void {
    if (reset) {
      this.portalPage = 0;
      this.portalOptions = [];
    }

    this.loadingPortals = true;

    // You need to implement this based on your API
    // This is a placeholder - adjust according to your actual API
    this.headService.getAllHeadsWithPortalsById(this.currentRoleId).subscribe({
      next: (res: any) => {
        const portals = res || [];

        // Assuming paginated response
        this.portalTotalPages = 1; // Set based on your API response

        this.portalOptions = [...this.portalOptions, ...portals];

        // Store initial portal IDs for reference
        this.initialPortalIds = this.editForm.portalsWithRange.map(
          (w) => w.portalId,
        );

        this.loadingPortals = false;
        this.loadingMorePortals = false;
      },
      error: (err) => {
        this.loadingPortals = false;
        this.loadingMorePortals = false;
      },
    });
  }

  // Add this method to get selected portal count
  getSelectedPortalCount(): number {
    return this.editForm.portalsWithRange?.length || 0;
  }

  // Add this method to get portal percentages
  getPortalPercentage(portalId: string): any {
    let portal = this.editForm.portalsWithRange.find(
      (w) => w.portalId === portalId,
    );
    if (!portal) {
      portal = {
        portalId: portalId,
        portalDomain: "",
        range: "",
        fttPercentage: 0,
        topupPercentage: 0,
        payoutPercentage: 0,
        active: true,
      };
      this.editForm.portalsWithRange.push(portal);
    }
    return portal;
  }

  // Update openEditModal to initialize portalOptions and initialPortalIds
  // openEditModal(agent: Agent): void {
  //   this.editForm = {
  //     id: agent.id,
  //     name: agent.name,
  //     email: agent.email || "",
  //     mobile: agent.mobile || "",
  //     info: agent.info || "",
  //     isActive: agent.active,
  //     portalsWithRange: (agent.portalsWithRange || []).map((w) => ({
  //       ...w,
  //       fttPercentage: Number(w.fttPercentage) || 0,
  //       topupPercentage: Number(w.topupPercentage) || 0,
  //       payoutPercentage: Number(w.payoutPercentage) || 0,
  //     })),
  //   };

  //   // Store initial portal IDs
  //   this.initialPortalIds = this.editForm.portalsWithRange.map(
  //     (w) => w.portalId,
  //   );

  //   this.selectedPortalsForAdd = [];
  //   this.addPortalSearchTerm = "";
  //   this.assignedPortalSearch = "";
  //   this.emailError = "";
  //   this.mobileError = "";
  //   this.portalsForAdd = [];
  //   this.showEditModal = true;

  //   // Load portals if needed
  //   if (this.portalOptions.length === 0) {
  //     this.loadPortalOptions(this.currentRoleId);
  //   }
  // }

  openEditModal(agent: Agent): void {
    const fullMobile = (agent.mobile || "").trim();

    let matchedCountry = null;
    let mobileWithoutCode = fullMobile;

    const sortedCountryCodes = [...this.countryCodes].sort(
      (a, b) => b.dialCode.length - a.dialCode.length,
    );

    for (const country of sortedCountryCodes) {
      if (fullMobile.startsWith(country.dialCode)) {
        matchedCountry = country;
        mobileWithoutCode = fullMobile.slice(country.dialCode.length).trim();
        break;
      }
    }

    this.selectedCountry = matchedCountry;
    this.showEditModal = true;
    this.isEditMode = false;
    this.loadingPortals = true;

    // this.editForm = {
    //   id: agent.id || "",
    //   name: agent.name || "",
    //   email: agent.email || "",
    //   mobile: agent.mobile || "",
    //   info: agent.info || "",
    //   isActive: !!agent.active,
    //   portalsWithRange: (agent.portalsWithRange || []).map((w: any) => ({
    //     portalId: w.portalId ?? "",
    //     portalDomain: w.portalDomain ?? "Unknown",
    //     range: w.range ?? "",
    //     active: typeof w.active === "boolean" ? w.active : true,
    //     fttPercentage: Number(w.fttPercentage) || 0,
    //     topupPercentage: Number(w.topupPercentage) || 0,
    //     payoutPercentage: Number(w.payoutPercentage) || 0,
    //   })),
    // };

    this.editForm = {
      id: agent.id || "",
      name: agent.name || "",
      email: agent.email || "",
      mobile: mobileWithoutCode || "",
      info: agent.info || "",
      isActive: !!agent.active,
      portalsWithRange: (agent.portalsWithRange || []).map((w: any) => ({
        portalId: w.portalId ?? "",
        portalDomain: w.portalDomain ?? "Unknown",
        range: w.range ?? "",
        active: typeof w.active === "boolean" ? w.active : true,
        fttPercentage: Number(w.fttPercentage) || 0,
        topupPercentage: Number(w.topupPercentage) || 0,
        payoutPercentage: Number(w.payoutPercentage) || 0,
      })),
    };

    this.initialPortalIds = this.editForm.portalsWithRange.map(
      (w) => w.portalId,
    );

    this.emailError = "";
    this.mobileError = "";

    // first load all portals for checkbox list
    this.headService.getAllHeadsWithPortalsById(this.currentRoleId).subscribe({
      next: (res: any) => {
        const opts = res || [];
        this.portalOptions = opts.map((w: any) => ({
          portalId: w.portalId ?? w.id ?? "",
          portalDomain: w.portalDomain ?? w.domain ?? "Unknown Portal",
          active: typeof w.active === "boolean" ? w.active : true,
        }));

        // then load latest percentages for selected branch
        this.branchService.getBranchPortalPercentage(agent.id).subscribe({
          next: (res2: any) => {
            const percentages = Array.isArray(res2) ? res2 : [];

            this.editForm.portalsWithRange = this.editForm.portalsWithRange.map(
              (portal) => {
                const matched = percentages.find(
                  (p: any) => p.portalId === portal.portalId,
                );

                return {
                  ...portal,
                  fttPercentage: Number(matched?.fttPercentage) || 0,
                  topupPercentage: Number(matched?.topupPercentage) || 0,
                  payoutPercentage: Number(matched?.payoutPercentage) || 0,
                };
              },
            );

            this.loadingPortals = false;
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.loadingPortals = false;
            this.snack.show("Failed to load portal percentages", false);
            this.cdr.detectChanges();
          },
        });
      },
      error: (err) => {
        this.portalOptions = [];
        this.loadingPortals = false;
        this.snack.show("Failed to load portals", false);
        this.cdr.detectChanges();
      },
    });
  }

  // Update loadPortalOptions to handle pagination
  loadPortalOptions(headId: any): void {
    this.loadingPortals = true;
    this.headService.getAllHeadsWithPortalsById(headId).subscribe({
      next: (res: any) => {
        const opts = res || [];
        this.portalOptions = opts.map((w: any) => ({
          portalId: w.portalId ?? w.id ?? "",
          portalDomain: w.portalDomain ?? w.domain ?? "Unknown Portal",
          active: typeof w.active === "boolean" ? w.active : true,
        }));
        this.portalTotalPages = 1;
        this.loadingPortals = false;
      },
      error: (err: any) => {
        this.portalOptions = [];
        this.loadingPortals = false;
        this.snack.show("Failed to load portals", false);
      },
    });
  }

  // Add these methods
  enableEditMode(): void {
    this.isEditMode = true;
  }

  // Optional: Add a method to handle cancel
  cancelEdit(): void {
    this.isEditMode = false;
    // Optionally reset form to original values here
    // this.resetFormToOriginalValues();
  }
}
