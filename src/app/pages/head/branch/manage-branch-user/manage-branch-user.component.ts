 import { Component, OnInit, ViewChild, ViewContainerRef } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { UserService } from "../../../services/user.service";
import { HeadService } from "../../../services/head.service";
import { BranchService } from "../../../services/branch.service";
    
@Component({
  selector: "app-manage-branch-user",
  templateUrl: "./manage-branch-user.component.html",
  styleUrl: "./manage-branch-user.component.css",
})
export class ManageBranchUserComponent implements OnInit {
  responseData: any[] = [];
  filteredData: any[] = [];
  pagedData: any[] = [];
  itemsPerPage: number = 5;
  currentPage: number = 1;
  totalItems: number = 0;
  totalPages: number = 0;
  showTable: boolean = true;
  searchTerm: string = "";

  headId: any;
  userId: any;
  selectedUser: any = null;
  submitAttempted: boolean = false;

  @ViewChild("departmentContainer", { read: ViewContainerRef })
  container!: ViewContainerRef;
  branchId: any;

  constructor(
    private userService: UserService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private headService: HeadService,
    private BranchService: BranchService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.params.subscribe((params) => {
      this.branchId = params["branchId"];
      this.headId = params["headId"];
      this.loadUsers();

      this.BranchService.getUsersByBranchId(this.branchId).subscribe({
        next: (res: any) => {
           this.userId = res[0].userId;
        },
      });
    });
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
          user.email?.toLowerCase().includes(term)
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

    // Validate passwords match if provided
    if ((password || confirmPassword) && password !== confirmPassword) {
      return;
    }

    const userToUpdate: any = {
      id: this.selectedUser.id,
      username: this.selectedUser.name,
      email: this.selectedUser.email,
      active: this.selectedUser.active,
      phone:this.selectedUser.phone,
      password: password || undefined,
    };

    // Call update API (example)
    this.userService.updateUser(userToUpdate.id,userToUpdate).subscribe({
      next: () => {
        alert('User updated successfully');
        this.loadUsers();
        this.closeModal();
      },
      error: () => {
        alert('Failed to update user');
      }
    });

      this.loadUsers();
    this.closeModal();
  }

  toggleStatus(user: any): void {
    this.BranchService
      .toggleChiefUserStatus(this.branchId, this.userId)
      .subscribe({
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

  // Helper function for template
  Math = Math;
}
