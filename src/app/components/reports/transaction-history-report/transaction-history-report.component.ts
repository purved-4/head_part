import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UtilsServiceService } from '../../../utils/utils-service.service';
import { UserService } from '../../../pages/services/user.service';
import { TransactionHistoryService } from '../../../pages/services/reports/transaction-history.service';
import { UserStateService } from '../../../store/user-state.service';

@Component({
  selector: 'app-transaction-history-report',
  templateUrl: './transaction-history-report.component.html',
  styleUrls: ['./transaction-history-report.component.css']
})
export class TransactionHistoryReportComponent implements OnInit {
  reportForm!: FormGroup;

  // Report state
  loading = false;
  hasSearched = false;
  errorMessage = '';
  successMessage = '';

  // Report data
  reports: any[] = [];
  fromDate!: string;
  toDate!: string;
  totalCount = 0;

  // Modal state
  showModal = false;
  loadingShow = false;
  showResponse: any = null;
  activeEntity: any = null;
  
  // Entity selection
  loadingEntities = false;
  entities: any[] = [];
  
  // Entity types mapping
  entityTypes: any = [];

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  // Filter options
  filterOptions = {
    transactionTypes: ['All', 'topup', 'payout', 'Commission', 'Reward'],
    statuses: ['All', 'Success', 'Failed', 'Pending'],
    websites: ['All', 'Website1', 'Website2', 'Website3']
  };
  currentUserId: any;
  currentRole: any;
  currentRoleId: any;

  constructor(
    private fb: FormBuilder,
    private transactionService: TransactionHistoryService,
    private userService: UserService,
    private utilService: UtilsServiceService,
    private stateService: UserStateService,
  ) {}

  ngOnInit(): void {
    this.currentUserId = this.stateService.getUserId();
    this.currentRole = this.stateService.getRole();
    this.currentRoleId = this.stateService.getCurrentRoleId();

    this.entityTypes = this.utilService.getRoleForDownLevelWithCurrentRoleIdAll(this.stateService.getRole());

    this.initializeForm();
    this.setupFormListeners();
    this.setDefaultDates();

    // Apply auto selection if entityType matches currentRole on load
    const initialRole = this.reportForm.get('entityType')?.value;
    this.applyEntityAutoSelect(initialRole);
  }

  initializeForm(): void {
    this.reportForm = this.fb.group({
      reportType: ['ENTITY', Validators.required],
      entityType: ['AGENT', Validators.required],
      entityId: ['', Validators.required],
      websiteId: [''],
      from: ['', Validators.required],
      to: ['', Validators.required],
      transactionType: ['All'],
      status: ['All'],
      searchTerm: ['']
    });
  }

  setupFormListeners(): void {
    // When entity type changes, either auto-select for current role OR fetch entities
    this.reportForm.get('entityType')?.valueChanges.subscribe(role => {
      this.applyEntityAutoSelect(role);
    });

    // When report type changes, adjust validators
    this.reportForm.get('reportType')?.valueChanges.subscribe(type => {
      if (type === 'WEBSITE') {
        this.reportForm.get('websiteId')?.setValidators([Validators.required]);
        this.reportForm.get('entityId')?.clearValidators();
      } else {
        this.reportForm.get('entityId')?.setValidators([Validators.required]);
        this.reportForm.get('websiteId')?.clearValidators();
      }
      this.reportForm.get('entityId')?.updateValueAndValidity();
      this.reportForm.get('websiteId')?.updateValueAndValidity();
    });
  }

  setDefaultDates(): void {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);

    const fromISO = weekAgo.toISOString().split('T')[0];
    const toISO = today.toISOString().split('T')[0];

    this.reportForm.patchValue({
      from: fromISO,
      to: toISO
    });

    // Also initialize component-level properties used by template
    this.fromDate = fromISO;
    this.toDate = toISO;
  }

  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * If selected role equals the current user's role, set entityId to currentRoleId and disable the select.
   * Otherwise enable the control and fetch available entities for the role.
   */
  applyEntityAutoSelect(role: string): void {
    if (!role) {
      this.entities = [];
      this.reportForm.patchValue({ entityId: '' });
      this.reportForm.get('entityId')?.enable();
      return;
    }

    const roleNormalized = String(role).toUpperCase();
    const currentRoleNormalized = String(this.currentRole || '').toUpperCase();

    if (roleNormalized === currentRoleNormalized && this.currentRoleId != null) {
      // Set entityId to currentRoleId and disable selection so user can't change it
      this.reportForm.patchValue({ entityId: this.currentRoleId });
      this.reportForm.get('entityId')?.disable();
      // optional: set entities array so UI still shows the selected item (could be adapted to show full object)
      this.entities = [this.currentRoleId];
    } else {
      // Different role: enable the select and fetch entities
      this.reportForm.get('entityId')?.enable();
      // clear any previously set entityId
      this.reportForm.patchValue({ entityId: '' });
      this.fetchEntitiesForRole(role);
    }
  }

  // Fetch entities based on role (kept mostly as before)
  fetchEntitiesForRole(role: string): void {
    if (!role) {
      this.entities = [];
      return;
    }

    this.loadingEntities = true;
    this.entities = [];

    this.userService.getByRole(this.currentRoleId, role.toUpperCase()).subscribe({
      next: (res: any) => {
        this.entities = Array.isArray(res) ? res : res?.data?.data || [];
        this.loadingEntities = false;
      },
      error: (err) => {
        console.error('Error fetching entities:', err);
        this.entities = [];
        this.loadingEntities = false;
        this.errorMessage = 'Failed to load entities';
      }
    });
  }

  // (Deprecated name onRoleChange kept for compatibility if template calls it)
  onRoleChange(role: string): void {
    this.applyEntityAutoSelect(role);
  }

  // Load report
  loadReport(): void {
    if (this.reportForm.invalid) {
      this.markFormGroupTouched(this.reportForm);
      return;
    }

    this.loading = true;
    this.hasSearched = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.reports = [];

    const formValue = this.reportForm.getRawValue(); // getRawValue to read disabled entityId if any

    // Prepare request based on report type
    const request: any = {
      entityType: formValue.entityType,
      from: formValue.from,
      to: formValue.to
    };

    if (formValue.reportType === 'ENTITY') {
      request.entityId = formValue.entityId;
    } else {
      request.websiteId = formValue.websiteId;
    }

    // Add filters if not 'All'
    if (formValue.transactionType !== 'All') {
      request.transactionType = formValue.transactionType;
    }
    if (formValue.status !== 'All') {
      request.status = formValue.status;
    }
    if (formValue.searchTerm) {
      request.searchTerm = formValue.searchTerm;
    }

    this.transactionService.getEntityReport(request).subscribe({
      next: (res: any) => {
        const data = res?.data || res;
        
        this.reports = data?.entities || data || [];
        this.fromDate = data?.from || formValue.from;
        this.toDate = data?.to || formValue.to;
        this.totalCount = data?.count || this.reports.length;
        this.totalPages = Math.ceil(this.totalCount / this.itemsPerPage);

        if (this.reports.length === 0) {
          this.errorMessage = 'No transactions found for the selected criteria';
        } else {
          this.successMessage = `Found ${this.totalCount} transactions`;
        }

        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Failed to fetch report. Please try again.';
      }
    });
  }

  // Show entity details
  showDetails(entity: any): void {
    this.showModal = true;
    this.loadingShow = true;
    this.showResponse = null;
    this.activeEntity = entity;

    const formValue = this.reportForm.getRawValue();
    const request: any = {
      entityId: formValue.reportType === 'ENTITY' ? formValue.entityId : formValue.websiteId,
      entityType: formValue.entityType.toUpperCase(),
      from: formValue.from,
      to: formValue.to,
      dataEntityId: entity.id
    };

    this.transactionService.getEntityReports(request).subscribe({
      next: (res: any) => {
        this.showResponse = res?.data || res;
        this.loadingShow = false;
      },
      error: (err) => {
        this.loadingShow = false;
        this.errorMessage = 'Failed to load details';
      }
    });
  }

  // Export report
  exportReport(format: string): void {
    const formValue = this.reportForm.getRawValue();
    const request: any = {
      entityType: formValue.entityType,
      from: formValue.from,
      to: formValue.to,
      exportFormat: format
    };

    if (formValue.reportType === 'ENTITY') {
      request.entityId = formValue.entityId;
    } else {
      request.websiteId = formValue.websiteId;
    }

    console.log('Exporting report:', request);
    alert(`Exporting report in ${format} format...`);
  }

  // Reset form
  resetForm(): void {
    // re-enable entityId control first so reset can set value properly
    this.reportForm.get('entityId')?.enable();

    this.reportForm.reset({
      reportType: 'ENTITY',
      entityType: 'AGENT',
      from: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0],
      transactionType: 'All',
      status: 'All',
      entityId: ''
    });
    this.reports = [];
    this.hasSearched = false;
    this.errorMessage = '';
    this.successMessage = '';

    // re-apply auto selection in case AGENT matches currentRole
    const role = this.reportForm.get('entityType')?.value;
    this.applyEntityAutoSelect(role);

    // update component-level dates
    this.fromDate = this.reportForm.get('from')?.value;
    this.toDate = this.reportForm.get('to')?.value;
  }

  // Pagination
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      // You can implement pagination API call here if needed
    }
  }

  // Utility function to mark all fields as touched
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Close modal
  closeShowModal(): void {
    this.showModal = false;
    this.showResponse = null;
    this.activeEntity = null;
  }

  // Get status badge class
  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  // Get transaction type class
  getTransactionTypeClass(type: string): string {
    switch (type?.toLowerCase()) {
      case 'topup': return 'bg-blue-100 text-blue-700';
      case 'payout': return 'bg-red-100 text-red-700';
      case 'commission': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  // Format currency
  formatCurrency(amount: any): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  }
}
