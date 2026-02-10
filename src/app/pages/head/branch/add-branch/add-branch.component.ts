import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { WebsiteService } from '../../../services/website.service';
import { SnackbarService } from '../../../../common/snackbar/snackbar.service';
import { ChiefService } from '../../../services/chief.service';
import { ManagerService } from '../../../services/manager.service';
import { UserStateService } from '../../../../store/user-state.service';
import { BranchService } from '../../../services/branch.service';
import { HeadService } from '../../../services/head.service';

export interface AddBranchComponent {
  name: string;
  mobile: string;
  email: string;
  info?: string;
  active: boolean;
  balance: number;
  websitePercentages: {
    [websiteId: string]: {
      topupPercentage: number;
      payoutPercentage: number;
    };
  };
  chiefId:any
  // businessTypes removed
}

@Component({
  selector: "app-add-branch",
  templateUrl: "./add-branch.component.html",
  styleUrls: ['./add-branch.component.scss'] // Optional: for custom styles
})
export class AddBranchComponent implements OnInit {
  chiefForm: FormGroup;
  successMessage = '';
  errorMessage = '';
  loading = false;
  websites: any[] = [];
  activeTab: 'available' | 'selected' = 'available';
  currentUserId: string | null ='';
  role: string | null ='';


  constructor(
    private fb: FormBuilder,
    private router: Router,
    private snackService: SnackbarService,
    private userStateService:UserStateService,
        private BranchService: BranchService,
        private headService: HeadService

  ) {
    this.chiefForm = this.fb.group({
      name: ['', Validators.required],
      mobile: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      email: ['', [Validators.required, Validators.email]],
      info: [''],
      isActive: [true],
      websiteIds: [[], Validators.required]
      // businessType removed
    });
  }

  ngOnInit() {
    this.currentUserId = this.userStateService.getCurrentRoleId()
    this.role = this.userStateService.getRole()
    this.loadWebsites();
  }

  loadWebsites() {
    this.headService.getAllHeadsWithWebsitesById(this.currentUserId ).subscribe({
      next: (res: any) => {
        console.log(res);
        this.websites = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
        this.initializeWebsiteControls();
      },
      error: (err) => {
        console.error('Error loading websites:', err);
        this.errorMessage = 'Failed to load websites. Please try again.';
      }
    });
  }

  initializeWebsiteControls() {
    this.websites.forEach(website => {
      // use website.websiteId (GUID) as identifier
      const wid = website.websiteId;

      // avoid duplicate controls if initialize called multiple times
      if (!this.chiefForm.contains(`topup_${wid}`)) {
        this.chiefForm.addControl(
          `topup_${wid}`,
          new FormControl('', [Validators.required, Validators.min(0), Validators.max(100)])
        );
      }

      if (!this.chiefForm.contains(`payout_${wid}`)) {
        this.chiefForm.addControl(
          `payout_${wid}`,
          new FormControl('', [Validators.required, Validators.min(0), Validators.max(100)])
        );
      }
    });
  }

  setActiveTab(tab: 'available' | 'selected') {
    this.activeTab = tab;
  }

  isWebsiteSelected(websiteId: string): boolean {
    const selectedIds: string[] = this.chiefForm.get('websiteIds')?.value || [];
    return selectedIds.includes(websiteId);
  }

  getAvailableWebsites(): any[] {
    const selectedIds: string[] = this.chiefForm.get('websiteIds')?.value || [];
    return this.websites.filter(website => !selectedIds.includes(website.websiteId));
  }

  getSelectedWebsites(): any[] {
    const selectedIds: string[] = this.chiefForm.get('websiteIds')?.value || [];
    return this.websites.filter(website => selectedIds.includes(website.websiteId));
  }

  onWebsiteSelectionChange(event: any, websiteId: string): void {
    const selectedIds: string[] = this.chiefForm.get('websiteIds')?.value || [];

    if (event.target.checked) {
      if (!selectedIds.includes(websiteId)) {
        this.chiefForm.get('websiteIds')?.setValue([...selectedIds, websiteId]);
        this.activeTab = 'selected';
      }
    } else {
      this.chiefForm.get('websiteIds')?.setValue(selectedIds.filter((id: string) => id !== websiteId));
    }

    this.chiefForm.get('websiteIds')?.markAsTouched();
  }

  removeWebsite(websiteId: string): void {
    const selectedIds: string[] = this.chiefForm.get('websiteIds')?.value || [];
    this.chiefForm.get('websiteIds')?.setValue(selectedIds.filter((id: string) => id !== websiteId));
    this.chiefForm.get('websiteIds')?.markAsTouched();

    this.chiefForm.get(`topup_${websiteId}`)?.setValue('');
    this.chiefForm.get(`payout_${websiteId}`)?.setValue('');

    if (this.getSelectedWebsites().length === 0) {
      this.activeTab = 'available';
    }
  }

  applyToAll(type: 'topup' | 'payout') {
    const selectedWebsites = this.getSelectedWebsites();
    if (selectedWebsites.length === 0) return;

    // Get value from first selected website
    const firstWebsite = selectedWebsites[0];
    const controlName = `${type}_${firstWebsite.websiteId}`;
    const value = this.chiefForm.get(controlName)?.value;

    // Apply to all selected websites
    selectedWebsites.forEach(website => {
      const control = this.chiefForm.get(`${type}_${website.websiteId}`);
      if (control && value !== null && value !== undefined) {
        control.setValue(value);
        control.markAsTouched();
      }
    });
  }

  // toggleBusinessType removed

  onSubmit(): void {
    if (this.loading) return;

    const websiteIds: string[] = this.chiefForm.get('websiteIds')?.value || [];

    // RULE 1
    if (websiteIds.length === 0) {
      this.snackService.show(
        'Please select at least one website',
        false,
        3000
      );
      return;
    }

    // RULE 2
    for (const websiteId of websiteIds) {
      const topupCtrl = this.chiefForm.get(`topup_${websiteId}`);
      const payoutCtrl = this.chiefForm.get(`payout_${websiteId}`);

      const topup = topupCtrl?.value;
      const payout = payoutCtrl?.value;

      topupCtrl?.markAsTouched();
      payoutCtrl?.markAsTouched();

      if (
        !this.isValidPercentage(topup) ||
        !this.isValidPercentage(payout)
      ) {
        this.snackService.show(
          'Please enter valid Topup & Payout percentage for all selected websites',
          false,
          4000
        );
        return;
      }
    }

    // RULE 3 – base form fields only
    if (
      this.chiefForm.get('name')?.invalid ||
      this.chiefForm.get('mobile')?.invalid ||
      this.chiefForm.get('email')?.invalid
    ) {
      this.snackService.show(
        'Please fill all required fields correctly',
        false,
        3000
      );
      return;
    }

    // RULE 4 - business type check removed

    // BUILD PAYLOAD
    const websitePercentages: Record<string, any> = {};

    websiteIds.forEach(id => {
      websitePercentages[String(id)] = {
        topupPercentage: Number(this.chiefForm.get(`topup_${id}`)?.value),
        payoutPercentage: Number(this.chiefForm.get(`payout_${id}`)?.value)
      };
    });

    const payload: any = {
      name: this.chiefForm.value.name,
      mobile: this.chiefForm.value.mobile,
      email: this.chiefForm.value.email,
      info: this.chiefForm.value.info,
      active: this.chiefForm.value.isActive,
      balance: 0,
      websitePercentages,
      createdByEntityId:this.currentUserId,
      createdByEntityType:this.role
    };

    this.loading = true;

    this.BranchService.addBranch(payload).subscribe({
      next: () => {
        this.loading = false;
        this.snackService.show('CHIEF created successfully', true, 3000);
        this.clearForm();
      },
      error: (err) => {
        this.loading = false;
        this.snackService.show(
          err?.error?.message || 'Failed to create CHIEF',
          false,
          3000
        );
      }
    });
  }

  private isValidPercentage(value: any): boolean {
    const num = Number(value);
    return !isNaN(num) && num >= 0 && num <= 100;
  }

  clearForm(): void {
    this.chiefForm.reset({
      name: '',
      mobile: '',
      email: '',
      info: '',
      isActive: true,
      websiteIds: []
      // businessType removed
    });

    this.websites.forEach(website => {
      const wid = website.websiteId;
      this.chiefForm.get(`topup_${wid}`)?.setValue('');
      this.chiefForm.get(`payout_${wid}`)?.setValue('');
    });

    this.successMessage = '';
    this.errorMessage = '';
    this.loading = false;
    this.activeTab = 'available';

    this.chiefForm.markAsPristine();
    this.chiefForm.markAsUntouched();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.chiefForm.get(fieldName);
    return field ? field.invalid && field.touched : false;
  }
}
