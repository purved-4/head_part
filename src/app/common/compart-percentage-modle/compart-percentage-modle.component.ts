


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

  portalPercentages: Array<{
    portalName: string;
    topupPercentage: number | null;
    fttPercentage: number | null;
    payoutPercentage: number | null;
  }> = [];

  constructor(
    private chiefService: ChiefService,
    private managerService: ManagerService,
    private headService: HeadService,
    private compartService: ComPartService,
    private ownerService:OwnerService
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

    const successHandler = (res: any) => {
      console.log(res);
      
      const data = Array.isArray(res) ? res : [res];

      this.portalPercentages = data.map((item: any) => ({
        portalName: item?.portalName ?? '--',
        topupPercentage: item?.topupPercentage ?? null,
        fttPercentage: item?.fttPercentage ?? null,
        payoutPercentage: item?.payoutPercentage ?? null,
      }));

      this.loading = false;
    };

    const errorHandler = () => {
      this.loading = false;
      this.errorMessage = 'Unable to load percentage details.';
    };

    this.compartService.getPercentageByEntityId(this.entityId,this.entityType).subscribe({
          next: successHandler,
          error: errorHandler,
        });
    // switch (this.entityType) {
    //   case 'OWNER':
    //     this.ownerService.getPortalPercentages(this.entityId)
    //     break;

    //   case 'CHIEF':
    //     this.chiefService.getChiefPortalPercentage(this.entityId).subscribe({
    //       next: successHandler,
    //       error: errorHandler,
    //     });
    //     break;

    //   case 'MANAGER':
    //     this.managerService.getManagerPortalPercentage(this.entityId).subscribe({
    //       next: successHandler,
    //       error: errorHandler,
    //     });
    //     break;

    //   case 'HEAD':
    //     this.headService.getHeadPortalPercentage(this.entityId).subscribe({
    //       next: successHandler,
    //       error: errorHandler,
    //     });
    //     break;

    //   default:
    //     this.loading = false;
    //     this.errorMessage = 'Invalid entity type.';
    //     break;
    // }
  }

  formatValue(value: number | null): string {
    return value === null || value === undefined ? '--' : `${value.toFixed(2)}%`;
  }
}