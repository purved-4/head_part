import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { BranchService } from '../../pages/services/branch.service';
import { UserService } from '../../pages/services/user.service';
import { UserStateService } from '../../store/user-state.service';

@Component({
  selector: 'app-portal-percentage-popup',
  templateUrl: './portal-percentage-popup.component.html',
})
export class PortalPercentagePopupComponent implements OnChanges {

  @Input() portal: any;
  @Input() visible: boolean = false;

  portalDetails: any = null;
  loading: boolean = false;

  constructor(
    private branchService: BranchService,
    private userService: UserService,
    private userStateService: UserStateService
  ) {}

  //  STEP 1: Detect popup open
  ngOnChanges(changes: SimpleChanges): void {

    if (changes['visible'] && this.visible && this.portal) {

      const entityId = this.userStateService.getUserId();

      console.log('STEP 1 → entityId:', entityId);

      if (!entityId) {
        console.error('EntityId not found');
        return;
      }

      this.portalDetails = null;

      //  STEP 2
      this.fetchUserAndThenPercentage(entityId);
    }
  }

  //  STEP 2: Call getUserFullDetail
  fetchUserAndThenPercentage(entityId: string) {

    this.loading = true;

    this.userService.getUserFullDetail(entityId).subscribe({
      next: (res: any) => {

        console.log('STEP 2 → User API Response:', res);

        const userId = res?.userInfo?.id;

        console.log('STEP 2 → Extracted userId:', userId);

        if (!userId) {
          console.error('User ID not found in response');
          this.loading = false;
          return;
        }

        //  STEP 3
        this.fetchPortalPercentage(userId);
      },
      error: (err) => {
        console.error('User API failed', err);
        this.loading = false;
      }
    });
  }

  //  STEP 3: Call getBranchPortalPercentage
  fetchPortalPercentage(userId: string) {

    this.branchService.getBranchPortalPercentage(userId).subscribe({
      next: (res: any) => {

        console.log('STEP 3 → Percentage API Response:', res);

        const portalId = this.portal.portalId || this.portal.id;

        console.log('Portal ID to match:', portalId);

        const portalData = (res || []).find(
          (p: any) =>
            String(p.portalId) === String(portalId) ||
            String(p.portalName) === String(this.portal.portalDomain)
        );

        console.log('Matched Portal:', portalData);

        this.portalDetails = {
          fttPercentage: Number(portalData?.fttPercentage) || 0,
          topupPercentage: Number(portalData?.topupPercentage) || 0,
          payoutPercentage: Number(portalData?.payoutPercentage) || 0,
        };

        this.loading = false;
      },
      error: (err) => {
        console.error('Percentage API failed', err);
        this.loading = false;
      }
    });
  }

  //  Close popup
  close() {
    this.visible = false;
  }
}