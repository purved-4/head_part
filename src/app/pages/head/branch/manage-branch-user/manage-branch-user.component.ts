import { Component, OnInit, ViewChild, ViewContainerRef } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { UserService } from "../../../services/user.service";
import { HeadService } from "../../../services/head.service";
import { BranchService } from "../../../services/branch.service";
import { SnackbarService } from "../../../../common/snackbar/snackbar.service";

@Component({
  selector: "app-manage-branch-user",
  templateUrl: "./manage-branch-user.component.html",
  styleUrls: ["./manage-branch-user.component.css"],
})
export class ManageBranchUserComponent implements OnInit {
  responseData: any[] = [];
  filteredData: any[] = [];
  pagedData: any[] = [];

  // Separate items per page for each view
  itemsPerPageTable: number = 5;
  itemsPerPageGrid: number = 6;
  itemsPerPage: number = this.itemsPerPageTable; // active value

  currentPage: number = 1;
  totalItems: number = 0;
  totalPages: number = 0;
  showTable: boolean = true;
  searchTerm: string = "";

  headId: any;
  userId: any;
  selectedUser: any = null;
  submitAttempted: boolean = false;

  // View mode
  viewMode: "table" | "grid" = "table";

  @ViewChild("departmentContainer", { read: ViewContainerRef })
  container!: ViewContainerRef;
  branchId: any;

  constructor(
    private userService: UserService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private headService: HeadService,
    private BranchService: BranchService,
    private SnackBar: SnackbarService,
  ) {}

  ngOnInit(): void {
    this.activatedRoute.params.subscribe((params) => {
      this.branchId = params["branchId"];
      this.headId = params["headId"];
      this.loadUsers();

      this.BranchService.getUsersByBranchId(this.branchId).subscribe({
        next: (res: any) => {
          this.userId = res[0]?.userId;
        },
      });
    });
  }

  // View toggle method
  toggleView(mode: "table" | "grid"): void {
    this.viewMode = mode;
    this.itemsPerPage =
      mode === "table" ? this.itemsPerPageTable : this.itemsPerPageGrid;
    this.currentPage = 1; // reset to first page
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.updatePagedData();
  }

  loadUsers(): void {
    if (!this.branchId) {
      this.showTable = false;
      return;
    }

    this.BranchService.getUsersByBranchId(this.branchId).subscribe({
      next: (res: any) => {
        this.responseData = res || [];
        this.applyFilter();

        this.showTable = true;
      },
      error: (err) => {
        console.error(err);
        this.SnackBar.show(err, false);
        this.responseData = [];
        this.filteredData = [];
        this.showTable = false;
      },
    });
  }

  applyFilter(): void {
    if (!this.searchTerm) {
      this.filteredData = [...this.responseData];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredData = this.responseData.filter(
        (user) =>
          user.name?.toLowerCase().includes(term) ||
          user.email?.toLowerCase().includes(term),
      );
    }

    this.totalItems = this.filteredData.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage = 1; // Reset to first page when filtering
    this.updatePagedData();
  }

  updatePagedData(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = this.currentPage * this.itemsPerPage;
    this.pagedData = this.filteredData.slice(start, end);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagedData();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagedData();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagedData();
    }
  }

  // Pagination numbers with ellipsis
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;

    if (this.totalPages <= maxPagesToShow) {
      for (let i = 1; i <= this.totalPages; i++) pages.push(i);
    } else {
      let start = Math.max(1, this.currentPage - 2);
      let end = Math.min(this.totalPages, start + maxPagesToShow - 1);
      if (end - start + 1 < maxPagesToShow) {
        start = Math.max(1, end - maxPagesToShow + 1);
      }
      for (let i = start; i <= end; i++) pages.push(i);

      if (start > 1) {
        pages.unshift(1);
        if (start > 2) pages.splice(1, 0, -1);
      }
      if (end < this.totalPages) {
        if (end < this.totalPages - 1) pages.push(-1);
        pages.push(this.totalPages);
      }
    }
    return pages;
  }

  onEdit(user: any): void {
    this.selectedUser = {
      id: user.userId,
      name: user.userName,
      email: user.userEmail,
      active: user.active,
      phone: user.userPhone,
      password: "",
      confirmPassword: "",
    };
  }

  handleSubmit(): void {
    this.submitAttempted = true;

    if (!this.selectedUser) return;

    const { password, confirmPassword } = this.selectedUser;

    if ((password || confirmPassword) && password !== confirmPassword) {
      return;
    }

    const userToUpdate: any = {
      id: this.selectedUser.id,
      username: this.selectedUser.name,
      email: this.selectedUser.email,
      active: this.selectedUser.active,
      phone: this.selectedUser.phone,
      password: password || undefined,
    };

    this.userService.updateUser(userToUpdate.id, userToUpdate).subscribe({
      next: () => {
        alert("User updated successfully");
        this.loadUsers();
        this.closeModal();
      },
      error: () => {
        alert("Failed to update user");
      },
    });
  }

  toggleStatus(user: any): void {
    this.BranchService.toggleChiefUserStatus(
      this.branchId,
      this.userId,
    ).subscribe({
      next: () => {
        user.active = !user.active;
      },
      error: (err) => {
        console.error("Failed to toggle user status:", err);
      },
    });
  }

  closeModal(): void {
    this.submitAttempted = false;
    this.selectedUser = null;
  }

  clearSearch(): void {
    this.searchTerm = "";
    this.applyFilter();
  }

  Math = Math;
}
