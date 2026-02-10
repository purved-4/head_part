import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import baseUrl from "../../../services/helper";
import { UpiService } from "../../../services/upi.service";
import { ActivatedRoute } from "@angular/router";
import { of } from "rxjs";
import { catchError } from "rxjs/operators";
import { BranchService } from "../../../services/branch.service";
import { UserStateService } from "../../../../store/user-state.service";
import { UserService } from "../../../services/user.service";
import { HeadService } from "../../../services/head.service";

@Component({
  selector: "app-head-upi",
  templateUrl: "./head-upi.component.html",
  styleUrl: "./head-upi.component.css",
})
export class HeadUpiComponent implements OnInit {
  upis: any[] = [];
  filteredUpis: any[] = [];
  searchTerm = "";
  filterStatus = "";
  selectedImage: string | null = null;
  branchId: any;
  userId: any;
  websites: any[] = [];

  // Add modal properties
  showAddModal = false;
  isAddingUpi = false;
  addUpiForm!: FormGroup;
  generatingQr = false;
  qrData: string | null = null;
  generatedFile: File | null = null;

  // Update modal properties
  showUpdateModal = false;
  editingUpi: any = null;
  updateForm: any = {
    vpa: "",
    limitAmount: "",
    status: "active",
    minAmount:'',
    maxAmount:''
  };
  isSubmitting = false;
  isGeneratingUpdateQr = false;
  updateQrData: string | null = null;
  generatedUpdateFile: File | null = null;
  originalVpa: string = "";
  currentRoleId: any;
  currentUserId: any;
  role: any;

  @ViewChild("qrcodeElem", { static: false, read: ElementRef })
  qrcodeElem!: ElementRef;
  @ViewChild("updateQrcodeElem", { static: false, read: ElementRef })
  updateQrcodeElem!: ElementRef;

  private vpaPattern = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

  constructor(
    private upiService: UpiService,
    private BranchService: BranchService,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private userStateService: UserStateService,
    private userService: UserService,
    private headService: HeadService
  ) {}

  ngOnInit() {
    this.initAddUpiForm();
    this.currentRoleId = this.userStateService.getCurrentRoleId();
    this.currentUserId = this.userStateService.getUserId();
    this.role = this.userStateService.getRole();

    this.loadUpis(this.currentRoleId);

    // this.route.paramMap.subscribe((paramMap) => {
    //   this.currentRoleId = paramMap.get("branchId");
    //   this.userId = paramMap.get("userId");

    //   if (this.currentRoleId) {

    //   }
    // });
  }

  // Check if UPI ID is valid
  isValidUpiId(vpa: string): boolean {
    return this.vpaPattern.test(vpa);
  }

  // Handle VPA change in update form
  onUpdateVpaChange() {
    // Clear generated QR if VPA changes from original
    if (this.updateForm.vpa !== this.originalVpa) {
      this.removeGeneratedUpdateQr();
    }
  }

  private initAddUpiForm() {
    this.addUpiForm = this.formBuilder.group({
      websiteId: ["", Validators.required],
      vpa: [
        "",
        [
          Validators.required,
          Validators.pattern(this.vpaPattern),
          Validators.minLength(5),
        ],
      ],
      limitAmount: [
        "",
        [Validators.required, Validators.min(1), Validators.max(10000000)],
      ],
      minAmount: [
        "",
        [Validators.required, Validators.min(1), Validators.max(10000000)],
      ],
      maxAmount: [
        "",
        [Validators.required, Validators.min(1), Validators.max(10000000)],
      ],
    });
  }

  // Open add modal
  openAddModal() {
    if (this.websites === null || this.websites.length === 0) {
      this.loadWebsites(this.currentRoleId);
    }

    this.showAddModal = true;
    document.body.style.overflow = "hidden";
  }

  // Close add modal
  closeAddModal() {
    this.showAddModal = false;
    this.addUpiForm.reset();
    this.qrData = null;
    this.generatedFile = null;
    this.isAddingUpi = false;
    document.body.style.overflow = "auto";
  }

  // Load websites
 loadWebsites(agentId: string) {
    if (!agentId) return;

    this.headService
      .getAllHeadsWithWebsitesById(agentId,"UPI")
      .pipe(
        catchError((err) => {
          console.error("Error loading websites:", err);
          return of([]);
        })
      )
      .subscribe((res: any) => {
        let websitesList: any[] = [];

        if (Array.isArray(res)) {
          websitesList = res;
        } else if (res && Array.isArray(res.data)) {
          websitesList = res.data;
        } else if (res) {
          websitesList = [res];
        }

        this.websites = websitesList.map((item) => ({
          id: item.id || item._id || "",
          websiteId: item.websiteId || item.websiteID || item.website_id || "",
          domain:
            item.websiteDomain ||
            item.domain ||
            item.domainName ||
            "Untitled Website",
          currency: item.currency || "INR",
        }));
      });
  }

  // Generate QR from VPA (for add modal)
  generateQrFromVpa() {
    const vpaControl = this.addUpiForm.get("vpa");
    if (!vpaControl || vpaControl.invalid) {
      vpaControl?.markAsTouched();
      return;
    }

    const vpa = String(vpaControl.value).trim();
    const upiIntent = `upi://pay?pa=${encodeURIComponent(vpa)}&cu=INR`;
    this.qrData = upiIntent;
    this.generatingQr = true;

    setTimeout(() => {
      this.captureQrImage(vpa, false);
    }, 300);
  }

  // Generate QR for update modal
  generateQrForUpdate() {
    const vpa = String(this.updateForm.vpa).trim();

    if (!this.isValidUpiId(vpa)) {
      alert("Please enter a valid UPI ID first");
      return;
    }

    const upiIntent = `upi://pay?pa=${encodeURIComponent(vpa)}&cu=INR`;
    this.updateQrData = upiIntent;
    this.isGeneratingUpdateQr = true;

    setTimeout(() => {
      this.captureQrImage(vpa, true);
    }, 300);
  }

  private captureQrImage(vpa: string, isForUpdate: boolean = false) {
    try {
      const qrcodeElement = isForUpdate
        ? this.updateQrcodeElem
        : this.qrcodeElem;

      if (!qrcodeElement?.nativeElement) {
        console.error("QR code element not found");
        if (isForUpdate) {
          this.isGeneratingUpdateQr = false;
        } else {
          this.generatingQr = false;
        }
        return;
      }

      setTimeout(() => {
        const canvas = qrcodeElement.nativeElement.querySelector("canvas");
        if (!canvas) {
          console.error("Canvas not found in QR component");
          if (isForUpdate) {
            this.isGeneratingUpdateQr = false;
          } else {
            this.generatingQr = false;
          }
          return;
        }

        canvas.toBlob(
          (blob: Blob | null) => {
            if (blob) {
              const filename = `upi_qr_${this.sanitizeFilename(
                vpa
              )}_${Date.now()}.png`;
              if (isForUpdate) {
                this.generatedUpdateFile = new File([blob], filename, {
                  type: "image/png",
                });
              } else {
                this.generatedFile = new File([blob], filename, {
                  type: "image/png",
                });
              }
            }

            if (isForUpdate) {
              this.isGeneratingUpdateQr = false;
            } else {
              this.generatingQr = false;
            }
          },
          "image/png",
          1.0
        );
      }, 100);
    } catch (error) {
      console.error("Error capturing QR image:", error);
      if (isForUpdate) {
        this.isGeneratingUpdateQr = false;
      } else {
        this.generatingQr = false;
      }
    }
  }

  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9_\-\.@]/gi, "_")
      .replace(/_{2,}/g, "_")
      .substring(0, 100);
  }

  downloadQr() {
    if (!this.generatedFile) return;

    const url = URL.createObjectURL(this.generatedFile);
    const a = document.createElement("a");
    a.href = url;
    a.download = this.generatedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  removeGeneratedQr() {
    this.qrData = null;
    this.generatedFile = null;
  }

  removeGeneratedUpdateQr() {
    this.updateQrData = null;
    this.generatedUpdateFile = null;
  }

  // Submit add UPI form
  submitAddUpi() {
    Object.keys(this.addUpiForm.controls).forEach((key) => {
      const control = this.addUpiForm.get(key);
      control?.markAsTouched();
    });

    if (this.addUpiForm.invalid) {
      alert("Please fill all required fields correctly.");
      return;
    }

    if (!this.generatedFile) {
      alert("Please generate QR code first.");
      return;
    }

    const selectedWebsite = this.websites.find(
      (site) => String(site.id) === String(this.addUpiForm.value.websiteId)
    );

    if (!selectedWebsite) {
      alert("Selected website not found.");
      return;
    }

    const payload = {
      website: selectedWebsite.websiteId,
      websiteId: selectedWebsite.id,
      vpa: this.addUpiForm.value.vpa,
      limitAmount: this.addUpiForm.value.limitAmount,
      agent_id: this.currentRoleId,
      entityId: this.currentRoleId,
      entityType: this.role,
      userId: this.userId,
      active: true,
      createdAt: new Date().toISOString(),
      minAmount:this.addUpiForm.value.minAmount,
      maxAmount:this.addUpiForm.value.maxAmount
    };

    const formData = new FormData();
    const dtoBlob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });
    formData.append("dto", dtoBlob);

    formData.append("file", this.generatedFile, this.generatedFile.name);

    if (this.currentRoleId) formData.append("agent_id", this.currentRoleId);
    if (this.currentRoleId) formData.append("branchId", this.currentRoleId);
    if (this.userId) formData.append("userId", this.userId);

    this.isAddingUpi = true;

    this.upiService.add(formData).subscribe({
      next: (response: any) => {
        this.isAddingUpi = false;

        if (response.success || response.id || response._id) {
          alert("UPI added successfully!");
          this.closeAddModal();
          this.loadUpis(this.currentRoleId);
        } else {
          alert(response.message || "Failed to add UPI. Please try again.");
        }
      },
      error: (error) => {
        console.error("Error adding UPI:", error);
        this.isAddingUpi = false;
        alert("Failed to add UPI. Please check your connection and try again.");
      },
    });
  }

  // Existing methods
  private normalizeStatus(item: any): string {
    if (typeof item.status === "string" && item.status.trim() !== "") {
      return item.status.toLowerCase();
    }
    if (typeof item.active === "boolean") {
      return item.active ? "active" : "inactive";
    }
    if (typeof item.status === "boolean") {
      return item.status ? "active" : "inactive";
    }
    return "inactive";
  }

  loadUpis(id: any) {
    this.upiService.getBybranchId(id).subscribe({
      next: (res: any) => {
        const rows = Array.isArray(res.data) ? res.data : [];

        this.upis = rows.map((r: any) => {
          const status = this.normalizeStatus(r);

          return {
            ...r,
            status,
            websiteDomain:
              r.websiteDomain ||
              r.websiteName ||
              r.website ||
              r.websiteId ||
              "",
            upiRange: r.range || r.upiRange || r.bankRange || "",
            qrId: r.qrId || r.qr_id || r.id || "",
            qrImagePath: r.qrImagePath
              ? `${baseUrl}${r.qrImagePath}`
              : r.qrImageUrl
              ? `${baseUrl}${r.qrImageUrl}`
              : null,
            limitAmount: r.limitAmount,
            vpa: r.vpa || r.upiId || "",
          };
        });

        this.filteredUpis = [...this.upis];
      },
      error: (err) => {
        console.error("Error loading UPIs:", err);
        this.upis = [];
        this.filteredUpis = [];
      },
    });
  }

  onSearch() {
    const q = (this.searchTerm || "").trim().toLowerCase();
    const statusFilter = (this.filterStatus || "").trim().toLowerCase();

    this.filteredUpis = this.upis.filter((upi) => {
      const qrId = (upi.qrId || "").toString().toLowerCase();
      const website = (upi.websiteDomain || "").toString().toLowerCase();
      const range = (upi.upiRange || "").toString().toLowerCase();
      const upiStatus = (upi.status || "").toString().toLowerCase();
      const vpa = (upi.vpa || "").toString().toLowerCase();

      const matchesSearch =
        !q ||
        qrId.includes(q) ||
        website.includes(q) ||
        range.includes(q) ||
        vpa.includes(q);

      const matchesStatus = !statusFilter || upiStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }

  resetFilters() {
    this.searchTerm = "";
    this.filterStatus = "";
    this.filteredUpis = [...this.upis];
  }

  getStatusClass(status: string): string {
    switch ((status || "").toString().toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "inactive":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  openImageModal(imageUrl: string | null) {
    if (!imageUrl) return;
    this.selectedImage = imageUrl;
    document.body.style.overflow = "hidden";
  }

  closeImageModal() {
    this.selectedImage = null;
    document.body.style.overflow = "auto";
  }

  downloadImage() {
    if (!this.selectedImage) return;
    const link = document.createElement("a");
    link.href = this.selectedImage;
    link.download = `qr-code-${Date.now()}.png`;
    link.click();
  }

  // Open update modal
  openUpdateModal(upi: any) {
    this.editingUpi = upi;
    this.updateForm = {
      vpa: upi.vpa || "",
      limitAmount: upi.limitAmount || "",
      status: upi.status || "active",
      maxAmount:upi.maxAmount,
      minAmount:upi.minAmount
    };
    this.originalVpa = upi.vpa || "";
    this.updateQrData = null;
    this.generatedUpdateFile = null;
    this.showUpdateModal = true;
    document.body.style.overflow = "hidden";
  }

  // Close update modal
  closeUpdateModal() {
    this.showUpdateModal = false;
    this.editingUpi = null;
    this.updateForm = {
      vpa: "",
      limitAmount: "",
      status: "active",
    };
    this.originalVpa = "";
    this.updateQrData = null;
    this.generatedUpdateFile = null;
    this.isSubmitting = false;
    this.isGeneratingUpdateQr = false;
    document.body.style.overflow = "auto";
  }

  // Submit update form
  submitUpdate() {
    if (!this.editingUpi) return;

    const vpa = (this.updateForm.vpa || "").trim();
    const limitRaw = this.updateForm.limitAmount;
    const limit =
      typeof limitRaw === "string" ? parseFloat(limitRaw) : limitRaw;

    if (!vpa) {
      alert("UPI ID is required");
      return;
    }

    if (!this.isValidUpiId(vpa)) {
      alert("Please enter a valid UPI ID (e.g., name@bank)");
      return;
    }

    if (isNaN(limit) || limit <= 0) {
      alert("Please enter a valid limit amount");
      return;
    }

    this.isSubmitting = true;

    const statusBool = this.updateForm.status === "active" ? true : false;

    const dtoPayload: any = {
      id: this.editingUpi.id || this.editingUpi.qrId,
      website: this.editingUpi.website,
      entityId: this.currentRoleId,
      entityType: this.role,
      vpa: vpa,
      limitAmount: limit.toString(),
      active: statusBool,
       minAmount:this.editingUpi.minAmount,
      maxAmount:this.editingUpi.maxAmount
    };

    if (this.currentRoleId) dtoPayload.branchId = this.currentRoleId;
    if (this.userId) dtoPayload.userId = this.userId;

    const formData = new FormData();
    const dtoBlob = new Blob([JSON.stringify(dtoPayload)], {
      type: "application/json",
    });
    formData.append("dto", dtoBlob);

    // Only append file if a new QR was generated
    if (this.generatedUpdateFile) {
      formData.append(
        "file",
        this.generatedUpdateFile,
        this.generatedUpdateFile.name
      );
    }
    console.log(dtoPayload);
    

    this.upiService.updateUpi(formData).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.closeUpdateModal();
        this.loadUpis(this.currentRoleId);
        alert("UPI updated successfully!");
      },
      error: (err) => {
        console.error("Error updating UPI:", err);
        this.isSubmitting = false;
        alert("Error updating UPI. Please try again.");
      },
    });
  }

  deleteUpi(upi: any) {
    if (
      confirm(
        `Are you sure you want to delete UPI "${upi.qrId}"? This action cannot be undone.`
      )
    ) {
      // Add delete logic here
    }
  }
}





