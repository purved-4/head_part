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

@Component({
  selector: 'app-website-percentage-model',
  templateUrl: './website-percentage-model.component.html',
  styleUrl: './website-percentage-model.component.css',
})
export class PortalPercentagePopupComponent implements OnInit, OnChanges {
  @Input() entityId: any;
  @Input() entityType: any;
  @Input() websiteId: any;

  @Output() closed = new EventEmitter<void>();

  loading = false;
  errorMessage = '';

  percentages = {
    topupPercentage: null as number | null,
    fttPercentage: null as number | null,
    payoutPercentage: null as number | null,
  };

  constructor(
    private chiefService: ChiefService,
    private managerService: ManagerService,
    private headService: HeadService,
    private compartService: ComPartService
  ) {}

  ngOnInit(): void {
    this.loadPercentages();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['entityId'] ||
      changes['entityType'] ||
      changes['websiteId']
    ) {
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
    // if (!this.entityId || !this.entityType ) {
    //   return;
    // }

    this.loading = true;
    this.errorMessage = '';

    const successHandler = (res: any) => {
      res = res[0]
      this.percentages = {
        topupPercentage: res?.topupPercentage ?? null,
        fttPercentage: res?.fttPercentage ?? null,
        payoutPercentage: res?.payoutPercentage ?? null,
      };
      this.loading = false;
    };

    const errorHandler = () => {
      this.loading = false;
      this.errorMessage = 'Unable to load percentage details.';
    };

    switch (this.entityType) {
      case 'OWNER':
        this.compartService.getPercentageByComPartId(this.entityId).subscribe({
          next: successHandler,
          error: errorHandler,
        });
        break;

      case 'CHIEF':
        this.chiefService.getChiefPortalPercentage(this.entityId).subscribe({
          next: successHandler,
          error: errorHandler,
        });
        break;

      case 'MANAGER':
        this.managerService.getManagerPortalPercentage(this.entityId).subscribe({
          next: successHandler,
          error: errorHandler,
        });
        break;

      case 'HEAD':
        this.headService.getHeadPortalPercentage(this.entityId).subscribe({
          next: successHandler,
          error: errorHandler,
        });
        break;

      default:
        this.loading = false;
        this.errorMessage = 'Invalid entity type.';
        break;
    }
  }

  formatValue(value: number | null): string {
    return value === null || value === undefined ? '--' : `${value.toFixed(2)}%`;
  }
}