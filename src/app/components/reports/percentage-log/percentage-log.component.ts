import { Component, OnInit, OnDestroy } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { HttpParams } from "@angular/common/http";
import { Subscription } from "rxjs";
import { PercentageLogService } from "../../../pages/services/reports/percentage-log.service";
import { SnackbarService } from "../../../common/snackbar/snackbar.service";

type HistoryDTO = {
  id: string;
  entityType: string;
  entityId: string;
  payinPercentage: number;
  payoutPercentage: number;
  createdBy?: string;
  updatedAt?: string | null;
  createdAt?: string | null;
  portalId?: string; // Added for portal categorization
  portalName?: string; // Added for portal display
};

type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

type PortalGroup = {
  portalId: string;
  portalName: string;
  logs: HistoryDTO[];
  expanded: boolean;
};

type GroupedResult = {
  entity: { id: string; name: string; type: string };
  logs: HistoryDTO[];
  summary: {
    count: number;
    avgpayin: number;
    avgpayout: number;
    minpayin: number;
    minpayout: number;
    maxpayin: number;
    maxpayout: number;
  };
  expanded: boolean;
  // New structure for portal grouping
  portalGroups: PortalGroup[];
  portalGroupsExpanded: boolean;
};

@Component({
  selector: "app-percentage-log",
  templateUrl: "./percentage-log.component.html",
})
export class PercentageLogComponent implements OnInit, OnDestroy {
  filterForm!: FormGroup;
  entities: { id: string; name: string; type?: string }[] = [];
  groupedResults: GroupedResult[] = [];
  loading = false;
  error: string | null = null;
  hasSearched = false;

  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;

  entityTypes = {
    SUB_ADMIN: "CHIEF CONTROLLER",
    MASTER: "MANAGER",
    AGENT: "HEAD",
    USER: "BRANCH",
  } as any;
  entityTypeKeys = Object.keys(this.entityTypes);

  private apiSub?: Subscription;
  Math: any = Math;

  constructor(
    private fb: FormBuilder,
    private percentageLog: PercentageLogService,
    private snackBar: SnackbarService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.setupFormListeners();
  }

  ngOnDestroy(): void {
    this.apiSub?.unsubscribe();
  }

  private initForm(): void {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    this.filterForm = this.fb.group(
      {
        fromDate: [weekAgo.toISOString().split("T")[0], Validators.required],
        toDate: [today.toISOString().split("T")[0], Validators.required],
        entityType: ["", Validators.required],
      },
      { validators: this.dateRangeValidator },
    );

    this.entities = [];
  }

  private setupFormListeners(): void {
    this.filterForm.get("entityType")?.valueChanges.subscribe((type) => {
      this.entities = [];
    });
  }

  private dateRangeValidator(
    group: FormGroup,
  ): { [key: string]: boolean } | null {
    const from = group.get("fromDate")?.value;
    const to = group.get("toDate")?.value;

    if (from && to && new Date(from) > new Date(to)) {
      return { dateRangeInvalid: true };
    }
    return null;
  }

  onSearch(): void {
    if (this.filterForm.invalid) {
      this.filterForm.markAllAsTouched();
      return;
    }
    this.hasSearched = true;
    this.currentPage = 0;
    this.fetchPage(this.currentPage);
  }

  private fetchPage(pageNumber: number): void {
    this.loading = true;
    this.error = null;

    const formValue = this.filterForm.getRawValue();

    const params = new HttpParams()
      .set("fromDate", formValue.fromDate)
      .set("toDate", formValue.toDate)
      .set("entityType", formValue.entityType || "")
      .set("pageNumber", String(pageNumber))
      .set("pageSize", String(this.pageSize));

    this.apiSub?.unsubscribe();
    this.apiSub = this.percentageLog.getHistoryWithType(formValue).subscribe({
      next: (res: PageResponse<HistoryDTO>) => {
        const page = res;
        const content = page.content || [];

        this.totalElements = page.totalElements ?? content.length;
        this.totalPages =
          page.totalPages ??
          (page.size ? Math.ceil(this.totalElements / page.size) : 1);
        this.currentPage = page.number ?? pageNumber;
        this.pageSize = page.size ?? this.pageSize;

        this.processResults(content);
        this.loading = false;
      },
      error: (err) => {
        this.snackBar.show(err.error.message, false);
        this.loading = false;
      },
    });
  }

  onReset(): void {
    this.initForm();
    this.groupedResults = [];
    this.error = null;
    this.currentPage = 0;
    this.totalPages = 0;
    this.totalElements = 0;
  }

  private processResults(logs: HistoryDTO[]): void {
    // Sort logs by entityId then createdAt descending
    logs.sort((a, b) => {
      const eid = (a.entityId || "").localeCompare(b.entityId || "");
      if (eid !== 0) return eid;
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    // Group by entityId
    const grouped = new Map<string, HistoryDTO[]>();
    logs.forEach((log) => {
      const key = log.entityId || "unknown";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(log);
    });

    // Create grouped results with portal categorization
    this.groupedResults = Array.from(grouped.entries()).map(
      ([entityId, groupLogs]) => {
        const payinVals = groupLogs.map((l) => Number(l.payinPercentage ?? 0));
        const payoutVals = groupLogs.map((l) =>
          Number(l.payoutPercentage ?? 0),
        );

        const avg = (arr: number[]) =>
          arr.length
            ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) /
              100
            : 0;
        const min = (arr: number[]) => (arr.length ? Math.min(...arr) : 0);
        const max = (arr: number[]) => (arr.length ? Math.max(...arr) : 0);

        // Sort group logs by portal then by createdAt descending
        groupLogs.sort((x, y) => {
          const portalX = x.portalId || "";
          const portalY = y.portalId || "";
          if (portalX !== portalY) return portalX.localeCompare(portalY);

          const tx = x.createdAt ? new Date(x.createdAt).getTime() : 0;
          const ty = y.createdAt ? new Date(y.createdAt).getTime() : 0;
          return ty - tx;
        });

        // Create portal groups
        const portalGroupsMap = new Map<string, PortalGroup>();
        groupLogs.forEach((log) => {
          const portalId = log.portalId || "unknown";
          const portalName = log.portalName || `Portal ${portalId}`;

          if (!portalGroupsMap.has(portalId)) {
            portalGroupsMap.set(portalId, {
              portalId,
              portalName,
              logs: [],
              expanded: false,
            });
          }
          portalGroupsMap.get(portalId)!.logs.push(log);
        });

        const portalGroups = Array.from(portalGroupsMap.values());

        return {
          entity: {
            id: entityId,
            name: `Entity ${entityId}`,
            type: groupLogs[0]?.entityType ?? "",
          },
          logs: groupLogs,
          summary: {
            count: groupLogs.length,
            avgpayin: avg(payinVals),
            avgpayout: avg(payoutVals),
            minpayin: min(payinVals),
            minpayout: min(payoutVals),
            maxpayin: max(payinVals),
            maxpayout: max(payoutVals),
          },
          expanded: false,
          portalGroups: portalGroups,
          portalGroupsExpanded: false,
        } as GroupedResult;
      },
    );

    // Sort groups by entityType then entityId
    this.groupedResults.sort((a, b) => {
      const t = (a.entity.type || "").localeCompare(b.entity.type || "");
      if (t !== 0) return t;
      return (a.entity.id || "").localeCompare(b.entity.id || "");
    });
  }

  toggleGroup(group: GroupedResult): void {
    group.expanded = !group.expanded;
  }

  togglePortalGroups(group: GroupedResult): void {
    group.portalGroupsExpanded = !group.portalGroupsExpanded;
  }

  togglePortalGroup(portalGroup: PortalGroup): void {
    portalGroup.expanded = !portalGroup.expanded;
  }

  getPortalStats(portalGroup: PortalGroup) {
    const logs = portalGroup.logs;
    const payinVals = logs.map((l) => Number(l.payinPercentage ?? 0));
    const payoutVals = logs.map((l) => Number(l.payoutPercentage ?? 0));

    const avg = (arr: number[]) =>
      arr.length
        ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100
        : 0;
    const min = (arr: number[]) => (arr.length ? Math.min(...arr) : 0);
    const max = (arr: number[]) => (arr.length ? Math.max(...arr) : 0);

    return {
      count: logs.length,
      avgPayin: avg(payinVals),
      avgPayout: avg(payoutVals),
      minPayin: min(payinVals),
      maxPayin: max(payinVals),
      minPayout: min(payoutVals),
      maxPayout: max(payoutVals),
    };
  }

  prevPage(): void {
    if (this.currentPage <= 0) return;
    this.currentPage--;
    this.fetchPage(this.currentPage);
  }

  nextPage(): void {
    if (this.currentPage + 1 >= this.totalPages) return;
    this.currentPage++;
    this.fetchPage(this.currentPage);
  }

  onPageSizeChange(size: string | number): void {
    this.pageSize = Number(size);
    this.currentPage = 0;
    this.fetchPage(this.currentPage);
  }

  autoRefreshWrapper = () => {
    if (!this.hasSearched) return;
    this.onSearch();
  };
}
