




import { Component, Input, OnInit } from '@angular/core';
import { ComPartService } from '../../pages/services/com-part.service';
import { UserStateService } from '../../store/user-state.service';
import { SnackbarService } from '../snackbar/snackbar.service';

@Component({
  selector: 'app-global-compart-percentage',
  templateUrl: './global-compart-percentage.component.html',
  styleUrl: './global-compart-percentage.component.css'
})
export class GlobalCompartPercentageComponent implements OnInit {
  minPercentage: any = null;

  // Optional overrides — falls back to the logged-in user's own entity/role if not provided
  @Input() entityId: any = null;
  @Input() role: any = null;

  isOpen = false;
  loading = false;

  public constructor(
    private userStateService: UserStateService,
    private compartService: ComPartService,
    private snackService: SnackbarService
  ) {}

  ngOnInit(): void {
    
    console.log(this.entityId,this.role)
  }

  open(): void {
    this.isOpen = true;
    this.fetchMinPercentages();
  }

  close(): void {
    this.isOpen = false;
  }

  fetchMinPercentages(): void {
    this.loading = true;
    this.minPercentage = null;

    this.compartService.getPercentageByEntityId(this.entityId, this.role).subscribe({
      next: (res: any) => {
        this.minPercentage = res?.minPercentage || null;
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.snackService.show(
          err.error?.message || "Failed to retrieve min percentages",
          false,
          3000,
        );
      },
    });
  }
}