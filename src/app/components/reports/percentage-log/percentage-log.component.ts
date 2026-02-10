import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { PercentageLogService } from '../../../pages/services/reports/percentage-log.service';

type HistoryDTO = {
  id: string;
  entityType: string;
  entityId: string;
  topupPercentage: number;
  payoutPercentage: number;
  createdBy?: string;
  updatedAt?: string | null;
  createdAt?: string | null;
  websiteId?: string; // Added for website categorization
  websiteName?: string; // Added for website display
};

type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
};

type WebsiteGroup = {
  websiteId: string;
  websiteName: string;
  logs: HistoryDTO[];
  expanded: boolean;
};

type GroupedResult = {
  entity: { id: string; name: string; type: string };
  logs: HistoryDTO[];
  summary: {
    count: number;
    avgtopup: number;
    avgpayout: number;
    mintopup: number;
    minpayout: number;
    maxtopup: number;
    maxpayout: number;
  };
  expanded: boolean;
  // New structure for website grouping
  websiteGroups: WebsiteGroup[];
  websiteGroupsExpanded: boolean;
};

@Component({
  selector: 'app-percentage-log',
  templateUrl: './percentage-log.component.html'
})
export class PercentageLogComponent implements OnInit, OnDestroy {
  filterForm!: FormGroup;
  entities: { id: string; name: string; type?: string }[] = [];
  groupedResults: GroupedResult[] = [];
  loading = false;
  error: string | null = null;

  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalElements = 0;

  entityTypes = { SUB_ADMIN: 'CHIEF CONTROLLER', MASTER: 'MANAGER', AGENT: 'HEAD', USER: 'BRANCH' } as any;
  entityTypeKeys = Object.keys(this.entityTypes);

  private apiSub?: Subscription;
Math: any = Math;

  constructor(
    private fb: FormBuilder,
    private percentageLog: PercentageLogService
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
        fromDate: [weekAgo.toISOString().split('T')[0], Validators.required],
        toDate: [today.toISOString().split('T')[0], Validators.required],
        entityType: ['', Validators.required]
      },
      { validators: this.dateRangeValidator }
    );

    this.entities = [];
  }

  private setupFormListeners(): void {
    this.filterForm.get('entityType')?.valueChanges.subscribe(type => {
      this.entities = [];
    });
  }

  private dateRangeValidator(group: FormGroup): { [key: string]: boolean } | null {
    const from = group.get('fromDate')?.value;
    const to = group.get('toDate')?.value;

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

    this.currentPage = 0;
    this.fetchPage(this.currentPage);
  }

  private fetchPage(pageNumber: number): void {
    this.loading = true;
    this.error = null;

    const formValue = this.filterForm.getRawValue();

    const params = new HttpParams()
      .set('fromDate', formValue.fromDate)
      .set('toDate', formValue.toDate)
      .set('entityType', formValue.entityType || '')
      .set('pageNumber', String(pageNumber))
      .set('pageSize', String(this.pageSize));

    this.apiSub?.unsubscribe();
    this.apiSub = this.percentageLog.getChiefsListByUserId(formValue).subscribe({
      next: (res: PageResponse<HistoryDTO>) => {
        const page = res;
        const content = page.content || [];

        this.totalElements = page.totalElements ?? content.length;
        this.totalPages = page.totalPages ?? (page.size ? Math.ceil(this.totalElements / page.size) : 1);
        this.currentPage = page.number ?? pageNumber;
        this.pageSize = page.size ?? this.pageSize;

        this.processResults(content);
        this.loading = false;
      },
      error: err => {
        console.error('Failed to fetch percentage history', err);
        this.error = 'Failed to fetch percentage history';
        this.loading = false;
      }
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
      const eid = (a.entityId || '').localeCompare(b.entityId || '');
      if (eid !== 0) return eid;
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    // Group by entityId
    const grouped = new Map<string, HistoryDTO[]>();
    logs.forEach(log => {
      const key = log.entityId || 'unknown';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(log);
    });

    // Create grouped results with website categorization
    this.groupedResults = Array.from(grouped.entries()).map(([entityId, groupLogs]) => {
      const topupVals = groupLogs.map(l => Number(l.topupPercentage ?? 0));
      const payoutVals = groupLogs.map(l => Number(l.payoutPercentage ?? 0));

      const avg = (arr: number[]) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : 0);
      const min = (arr: number[]) => (arr.length ? Math.min(...arr) : 0);
      const max = (arr: number[]) => (arr.length ? Math.max(...arr) : 0);

      // Sort group logs by website then by createdAt descending
      groupLogs.sort((x, y) => {
        const websiteX = x.websiteId || '';
        const websiteY = y.websiteId || '';
        if (websiteX !== websiteY) return websiteX.localeCompare(websiteY);
        
        const tx = x.createdAt ? new Date(x.createdAt).getTime() : 0;
        const ty = y.createdAt ? new Date(y.createdAt).getTime() : 0;
        return ty - tx;
      });

      // Create website groups
      const websiteGroupsMap = new Map<string, WebsiteGroup>();
      groupLogs.forEach(log => {
        const websiteId = log.websiteId || 'unknown';
        const websiteName = log.websiteName || `Website ${websiteId}`;
        
        if (!websiteGroupsMap.has(websiteId)) {
          websiteGroupsMap.set(websiteId, {
            websiteId,
            websiteName,
            logs: [],
            expanded: false
          });
        }
        websiteGroupsMap.get(websiteId)!.logs.push(log);
      });

      const websiteGroups = Array.from(websiteGroupsMap.values());

      return {
        entity: {
          id: entityId,
          name: `Entity ${entityId}`,
          type: groupLogs[0]?.entityType ?? ''
        },
        logs: groupLogs,
        summary: {
          count: groupLogs.length,
          avgtopup: avg(topupVals),
          avgpayout: avg(payoutVals),
          mintopup: min(topupVals),
          minpayout: min(payoutVals),
          maxtopup: max(topupVals),
          maxpayout: max(payoutVals)
        },
        expanded: false,
        websiteGroups: websiteGroups,
        websiteGroupsExpanded: false
      } as GroupedResult;
    });

    // Sort groups by entityType then entityId
    this.groupedResults.sort((a, b) => {
      const t = (a.entity.type || '').localeCompare(b.entity.type || '');
      if (t !== 0) return t;
      return (a.entity.id || '').localeCompare(b.entity.id || '');
    });
  }

  toggleGroup(group: GroupedResult): void {
    group.expanded = !group.expanded;
  }

  toggleWebsiteGroups(group: GroupedResult): void {
    group.websiteGroupsExpanded = !group.websiteGroupsExpanded;
  }

  toggleWebsiteGroup(websiteGroup: WebsiteGroup): void {
    websiteGroup.expanded = !websiteGroup.expanded;
  }

  getWebsiteStats(websiteGroup: WebsiteGroup) {
    const logs = websiteGroup.logs;
    const topupVals = logs.map(l => Number(l.topupPercentage ?? 0));
    const payoutVals = logs.map(l => Number(l.payoutPercentage ?? 0));

    const avg = (arr: number[]) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : 0);
    const min = (arr: number[]) => (arr.length ? Math.min(...arr) : 0);
    const max = (arr: number[]) => (arr.length ? Math.max(...arr) : 0);

    return {
      count: logs.length,
      avgTopup: avg(topupVals),
      avgPayout: avg(payoutVals),
      minTopup: min(topupVals),
      maxTopup: max(topupVals),
      minPayout: min(payoutVals),
      maxPayout: max(payoutVals)
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
}