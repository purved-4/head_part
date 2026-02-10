import { Component, OnInit, HostListener } from "@angular/core";
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
  websitesWithRange: WebsiteRange[];
  active: boolean;
  isActive?: boolean;
  showAllWebsites?: boolean;
}

interface EditForm {
  id: string;
  name: string;
  isActive: boolean;
  websitesWithRange: WebsiteRange[];
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

  // Edit Modal Properties
  showEditModal = false;
  editForm: EditForm = {
    id: "",
    name: "",
    isActive: true,
    websitesWithRange: [],
  };

  // Website Selection Properties
  websiteOptions: any[] = [];
  filteredWebsites: any[] = [];
  websiteSearchTerm = "";
  showWebsiteDropdown = false;
  selectedWebsites: any[] = [];

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
  currentRoleId: any;

  constructor(
    private route: ActivatedRoute,
    private ManagerService: ManagerService,
    private BranchService: BranchService,
    private headService: HeadService,
    private userStateService: UserStateService
  ) {}

  ngOnInit(): void {
    this.currentRoleId = this.userStateService.getCurrentRoleId();
    this.loadbranchs(this.currentRoleId);
  }

  loadbranchs(headId: any): void {
    this.loading = true;
    this.BranchService.getBranchWithHeadId(headId).subscribe({
      next: (res: any) => {
        const list = res || [];
        this.agents = list.map((agent: any) => {
          const websiteResponse = Array.isArray(agent.websiteResponse)
            ? agent.websiteResponse
            : [];
          return {
            ...agent,
            showAllWebsites: false,
            websitesWithRange: websiteResponse.map((w: any) => ({
              websiteId: w.websiteId ?? w.id ?? "",
              range: w.range ?? "",
              websiteDomain: w.websiteDomain ?? w.domain ?? "Unknown",
              active:
                typeof w.active === "boolean"
                  ? w.active
                  : typeof w.isActive === "boolean"
                  ? w.isActive
                  : true,
              topupPercentage: w.topupPercentage || 0,
              payoutPercentage: w.payoutPercentage || 0,
            })),
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
        this.error = "Failed to load agents";
        this.loading = false;
        console.error(err);
      },
    });
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

  getPageNumbers(): number[] {
    const totalPages = Math.ceil(this.filteredAgents.length / this.pageSize);
    const pages: number[] = [];

    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }

    // Show only 5 pages around current page
    const start = Math.max(1, this.page - 2);
    const end = Math.min(totalPages, this.page + 2);

    return pages.slice(start - 1, end);
  }

  goToPage(pageNum: number): void {
    this.page = pageNum;
    this.updatePagination();
  }

  // Export functionality
  exportToCSV(): void {
    const csvContent = this.convertToCSV(this.filteredAgents);
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sub-agents-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  convertToCSV(agents: Agent[]): string {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Status",
      "Websites",
      "Avg Topup %",
      "Avg Payout %",
    ];
    const rows = agents.map((agent) => {
      const avgTopup =
        agent.websitesWithRange?.reduce(
          (sum, w) => sum + (w.topupPercentage || 0),
          0
        ) / (agent.websitesWithRange?.length || 1);
      const avgPayout =
        agent.websitesWithRange?.reduce(
          (sum, w) => sum + (w.payoutPercentage || 0),
          0
        ) / (agent.websitesWithRange?.length || 1);

      return [
        agent.name || "",
        agent.email || "",
        agent.mobile || "",
        agent.active ? "Active" : "Inactive",
        agent.websitesWithRange?.length || 0,
        avgTopup.toFixed(1),
        avgPayout.toFixed(1),
      ].join(",");
    });

    return [headers.join(","), ...rows].join("\n");
  }

  // Get total websites count for edit modal
  getTotalWebsitesCount(): number {
    return (
      (this.editForm.websitesWithRange?.length || 0) +
      this.selectedWebsites.length
    );
  }

  loadWebsiteOptions(headId: any): void {
    this.headService.getAllHeadsWithWebsitesById(headId).subscribe({
      next: (res: any) => {
        const opts = res || [];
        this.websiteOptions = opts.map((w: any) => ({
          websiteId: w.websiteId ?? w.id ?? "",
          websiteDomain: w.websiteDomain ?? w.domain ?? "Unknown",
          active:
            typeof w.active === "boolean"
              ? w.active
              : typeof w.isActive === "boolean"
              ? w.isActive
              : true,
        }));
        this.filteredWebsites = this.websiteOptions;
      },
      error: (err: any) => {
        console.error("Error loading websites:", err);
        this.websiteOptions = [];
        this.filteredWebsites = [];
      },
    });
  }

  // Edit Modal Methods
  // --- openEditModal: load websites when modal opens ---
  openEditModal(agent: Agent): void {
    // fill edit form from agent
    this.editForm = {
      id: agent.id,
      name: agent.name,
      isActive: agent.active,
      websitesWithRange: (agent.websitesWithRange || []).map((w) => ({
        ...w,
        topupPercentage: w.topupPercentage || 0,
        payoutPercentage: w.payoutPercentage || 0,
      })),
    };

    // reset selections & filtered lists
    this.selectedWebsites = [];
    this.websiteSearchTerm = "";

    // Load the latest website options for the head when modal opens
    // (this will set `websiteOptions` and `filteredWebsites` inside loadWebsiteOptions)
    this.loadWebsiteOptions(this.currentRoleId);

    // keep dropdown closed initially
    this.showWebsiteDropdown = false;

    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editForm = {
      id: "",
      name: "",
      isActive: true,
      websitesWithRange: [],
    };
    this.selectedWebsites = [];
  }

  // Validate website percentages
  validateWebsitePercentages(): boolean {
    // Check all existing websites
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

    // Check new websites
    for (const website of this.selectedWebsites) {
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

  // Website Selection Methods
  filterWebsites(): void {
    if (!this.websiteSearchTerm) {
      this.filteredWebsites = this.websiteOptions;
    } else {
      const searchTerm = this.websiteSearchTerm.toLowerCase();
      this.filteredWebsites = this.websiteOptions.filter((website) =>
        (website.websiteDomain || "").toLowerCase().includes(searchTerm)
      );
    }
  }

  isWebsiteSelected(websiteId: string): boolean {
    return (
      this.selectedWebsites.some(
        (website) => website.websiteId === websiteId
      ) ||
      this.editForm.websitesWithRange.some(
        (website) => website.websiteId === websiteId
      )
    );
  }

  // --- toggleWebsite: handle clicks from dropdown rows (mouse events), and stopPropagation ---
  toggleWebsite(websiteId: string, event?: Event): void {
    // prevent the document click listener from closing the dropdown
    event?.stopPropagation?.();

    // If website already in newly selected list -> remove it
    const newIdx = this.selectedWebsites.findIndex(
      (w) => w.websiteId === websiteId
    );
    if (newIdx !== -1) {
      this.selectedWebsites.splice(newIdx, 1);
      return;
    }

    // If website already exists in editForm.websitesWithRange (existing assignment), do nothing
    const existsInEdit = (this.editForm.websitesWithRange || []).some(
      (w) => w.websiteId === websiteId
    );
    if (existsInEdit) {
      // optionally show a toast/alert if you want: "Website already assigned"
      return;
    }

    // Otherwise add to selectedWebsites (with default percentages)
    const website = this.websiteOptions.find((w) => w.websiteId === websiteId);
    if (website) {
      this.selectedWebsites.push({
        websiteId: website.websiteId,
        websiteDomain: website.websiteDomain,
        topupPercentage: 0,
        payoutPercentage: 0,
      });
    }
  }

  addWebsite(websiteId: string): void {
    if (!websiteId || this.isWebsiteSelected(websiteId)) return;

    const website = this.websiteOptions.find((w) => w.websiteId === websiteId);
    if (website) {
      this.selectedWebsites.push({
        websiteId: website.websiteId,
        websiteDomain: website.websiteDomain,
        topupPercentage: 0,
        payoutPercentage: 0,
      });
    }
  }

  removeNewWebsite(index: any): void {
    this.selectedWebsites.splice(index, 1);
  }

  removeWebsiteFromEdit(index: number): void {
    this.editForm.websitesWithRange.splice(index, 1);
  }

  getWebsiteName(websiteId: string): string {
    const website = this.websiteOptions.find((w) => w.websiteId === websiteId);
    return website ? website.websiteDomain : "Unknown Website";
  }

  updateBranch(): void {
    if (!this.editForm.name) return;

    // Validate all percentages
    if (!this.validateWebsitePercentages()) {
      alert("Please enter valid percentages (0-100) for all websites");
      return;
    }

    this.loading = true;

    // Combine existing websites with new selected websites
    const allWebsites = [
      ...this.editForm.websitesWithRange,
      ...this.selectedWebsites,
    ];

    // Build websitePercentages object
    const websitePercentages: any = {};
    allWebsites.forEach((website) => {
      websitePercentages[website.websiteId] = {
        topupPercentage: Number(website.topupPercentage),
        payoutPercentage: Number(website.payoutPercentage),
      };
    });

    const websiteIds: string[] = Array.from(
      new Set(
        allWebsites.map((w: any) => w.websiteId).filter((id: any) => !!id)
      )
    );

    const payload = {
      id: this.editForm.id,
      name: this.editForm.name,
      isActive: this.editForm.isActive,
      headId: this.currentRoleId,
      websites: websiteIds,
      websitePercentages: websitePercentages,
    };

    this.BranchService.updateBranch(payload).subscribe({
      next: (res: any) => {
        this.loadbranchs(this.currentRoleId);
        this.closeEditModal();
        this.loading = false;
      },
      error: (err) => {
        console.error("Failed to update sub agent:", err);
        this.error = "Failed to update sub agent";
        this.loading = false;
      },
    });
  }

  // Handle click outside to close dropdown
  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest(".website-dropdown-container")) {
      this.showWebsiteDropdown = false;
    }
  }

  // Existing methods
  toggleWebsiteView(agent: Agent): void {
    agent.showAllWebsites = !agent.showAllWebsites;
  }

  filterAgents(): void {
    if (!this.searchTerm) {
      this.filteredAgents = [...this.agents];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredAgents = this.agents.filter(
        (agent) =>
          (agent.name || "").toLowerCase().includes(term) ||
          agent.websitesWithRange?.some((website: WebsiteRange) =>
            (website.websiteDomain || "").toLowerCase().includes(term)
          ) ||
          (agent.headId || agent.id || "").toLowerCase().includes(term)
      );
    }
    this.page = 1;
    this.updatePagination();
  }

  updatePagination(): void {
    const start = (this.page - 1) * this.pageSize;
    this.paginatedAgents = this.filteredAgents.slice(
      start,
      start + this.pageSize
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

  // Agent status toggle with optimistic update & rollback
  toggleStatus(agent: Agent): void {
    const targetheadId = agent?.headId || agent?.id || this.currentRoleId;
    if (!targetheadId) {
      console.error("No agent id available to toggle status");
      return;
    }
    if (this.togglingAgent[targetheadId]) return;
    this.togglingAgent[targetheadId] = true;

    const prev = agent.active;
    agent.active = !agent.active;

    this.BranchService.toggleChiefStatus(targetheadId).subscribe({
      next: () => {
        this.togglingAgent[targetheadId] = false;
      },
      error: (err) => {
        agent.active = prev;
        this.togglingAgent[targetheadId] = false;
        console.error("Failed to toggle status", err);
        alert("Failed to update agent status");
      },
    });
  }

  // Per-website status toggle with optimistic update & rollback
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

    this.BranchService.changeManagerWebsiteStatus(
      website.websiteId,
      agent.id
    ).subscribe({
      next: () => {
        this.togglingWebsite[key] = false;
      },
      error: (err: any) => {
        website.active = prevState;
        this.togglingWebsite[key] = false;
        console.error("Failed to toggle website status", err);
        alert("Failed to update website status. Please try again.");
      },
    });
  }

  calculateStatistics(): void {
    this.activeAgentsCount = this.agents.filter((agent) => agent.active).length;

    // Calculate total websites across all agents
    this.totalWebsitesCount = this.agents.reduce((total, agent) => {
      return total + (agent.websitesWithRange?.length || 0);
    }, 0);

    // Calculate average topup percentage
    const allPercentages = this.agents.flatMap(
      (agent) =>
        agent.websitesWithRange?.map(
          (website) => website.topupPercentage || 0
        ) || []
    );
    if (allPercentages.length > 0) {
      this.avgTopupPercentage = parseFloat(
        (
          allPercentages.reduce((a, b) => a + b, 0) / allPercentages.length
        ).toFixed(1)
      );
    }
  }

  isWebsiteToggling(headId: string, websiteId: string): boolean {
    return !!this.togglingWebsite[`${headId}_${websiteId}`];
  }
}
