import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { ChiefService } from '../../pages/services/chief.service';
import { ManagerService } from '../../pages/services/manager.service';
import { HeadService } from '../../pages/services/head.service';
import { ComPartService } from '../../pages/services/com-part.service';
import { OwnerService } from '../../pages/services/owner.service';

interface CompartPercentageRow {
  compartName: string;
  payinPercentage: number | null;
  fttPercentage: number | null;
  payoutPercentage: number | null;
  compartUsername?:string
}

@Component({
  selector: 'app-compart-percentage-modle',
  templateUrl: './compart-percentage-modle.component.html',
  styleUrl: './compart-percentage-modle.component.css'
})
export class CompartPercentageModleComponent implements OnInit, OnChanges {
  @Input() entityId: any;
  @Input() entityType: any;

  @Output() closed = new EventEmitter<void>();

  loading = false;
  errorMessage = '';

  portalPercentages: CompartPercentageRow[] = [];

  constructor(
    private compartService: ComPartService,
  ) {}

  ngOnInit(): void {
    this.loadPercentages();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['entityId'] || changes['entityType']) {
      this.loadPercentages();
    }
  }

  closeModal(): void {
    this.closed.emit();
  }

  getEntityLabel(): string {
    switch (this.entityType) {
      case 'OWNER':
        return 'Owner';
      case 'CHIEF':
        return 'Chief';
      case 'MANAGER':
        return 'Manager';
      case 'HEAD':
        return 'Head';
      default:
        return 'Entity';
    }
  }

  loadPercentages(): void {
    if (!this.entityId || !this.entityType) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.portalPercentages = [];

    this.compartService.getPercentageByEntityId(this.entityId, this.entityType).subscribe({
      next: (res: any) => {
        this.portalPercentages = this.normalizeResponse(res);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to load percentage details.';
      },
    });
  }

  private normalizeResponse(res: any): CompartPercentageRow[] {
    if (!res) {
      return [];
    }

    // Case 1: response is already an array
    if (Array.isArray(res)) {
      return res.map((item: any) => ({
        compartName: item?.compartUsername ?? item?.portalName ?? '--',
        payinPercentage: this.toNumberOrNull(item?.payinPercentage),
        fttPercentage: this.toNumberOrNull(item?.fttPercentage),
        payoutPercentage: this.toNumberOrNull(item?.payoutPercentage),
      }));
    }

    // Case 2: response is an object like:
    // {
    //   comchief1: { payinPercentage: 7, fttPercentage: 7, payoutPercentage: 7 }
    // }
    return Object.keys(res).map((key: string) => {
      const item = res[key] || {};
      return {
        compartName: key,
        payinPercentage: this.toNumberOrNull(item?.payinPercentage),
        fttPercentage: this.toNumberOrNull(item?.fttPercentage),
        payoutPercentage: this.toNumberOrNull(item?.payoutPercentage),
      };
    });
  }

  private toNumberOrNull(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  }

  formatValue(value: number | null): string {
    return value === null || value === undefined ? '--' : `${value.toFixed(2)}%`;
  }
}