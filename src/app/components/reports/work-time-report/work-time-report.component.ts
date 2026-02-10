import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { TransactionHistoryService } from "../../../pages/services/reports/transaction-history.service";
import { UserService } from "../../../pages/services/user.service";
import { WorkReportsService } from "../../../pages/services/reports/work-report.service";
import { UserStateService } from "../../../store/user-state.service";
import { UtilsServiceService } from "../../../utils/utils-service.service";

interface Entity {
  id: string;
  name: string;
  [key: string]: any;
}

interface WorkTimeRecord {
  date: string;
  clockIn: string;
  clockOut: string;
  workedTime?: string;
  status: string;
  location?: string;
  [key: string]: any;
}

interface UserGroup {
  userId: string;
  userName: string;
  records: WorkTimeRecord[];
  expanded: boolean;
}

@Component({
  selector: "app-work-time-report",
  templateUrl: "./work-time-report.component.html",
  styleUrls: ["./work-time-report.component.css"],
})
export class WorkTimeReportComponent implements OnInit {
  entityTypes: any = [];

  entities: Entity[] = [];
  userGroups: UserGroup[] = [];
  loading = false;
  loadingEntities = false;
  reportForm: FormGroup;
  maxDate: string;
  currentUserId: any;
  currentRole: any;
  currentRoleId: any;

  constructor(
    private balanceHistoryService: TransactionHistoryService,
    private userService: UserService,
    private fb: FormBuilder,
    private stateService: UserStateService,
    private utilService: UtilsServiceService,
    private workTimeReport: WorkReportsService
  ) {
    // Set max date to today
    const today = new Date();
    this.maxDate = today.toISOString().split("T")[0];

    this.reportForm = this.fb.group(
      {
        entityType: ["", Validators.required],
        entityId: ["", Validators.required],
        fromDate: [""],
        toDate: [""],
      },
      { validators: this.dateRangeValidator }
    );
  }

  ngOnInit(): void {
    this.entityTypes = this.utilService.getRoleForDownLevelWithCurrentRoleIdAll(
      this.stateService.getRole()
    );

    this.currentUserId = this.stateService.getUserId();
    this.currentRole = this.stateService.getRole();
    this.currentRoleId = this.stateService.getCurrentRoleId();

    // Initialize form with current month (first day -> today)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    this.reportForm.patchValue({
      fromDate: firstDay.toISOString().split("T")[0],
      toDate: today.toISOString().split("T")[0],
    });

    // If initial entityType equals current role, apply auto-select
    const initialRole = this.reportForm.get("entityType")?.value;
    this.applyEntityAutoSelect(initialRole);

    // Listen for entityType changes to apply auto-select or fetch entities
    this.reportForm.get("entityType")?.valueChanges.subscribe((role) => {
      this.applyEntityAutoSelect(role);
    });

    // Subscribe to entity changes to load websites (kept as before)
    this.reportForm.get("entityId")?.valueChanges.subscribe(() => {
      this.onRoleEntityChange(); // renamed internal method to avoid confusion
    });
  }

  dateRangeValidator(form: FormGroup): any {
    const fromDate = form.get("fromDate")?.value;
    const toDate = form.get("toDate")?.value;

    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);

      if (from > to) {
        return { dateRange: true };
      }
    }
    return null;
  }

  /**
   * Apply auto-selection behavior:
   * - if selected role equals current user's role -> set entityId to currentRoleId and disable control
   * - otherwise enable control and fetch entities for the role
   */
  applyEntityAutoSelect(role: string | null | undefined): void {
    if (!role) {
      this.entities = [];
      this.reportForm.get("entityId")?.enable();
      this.reportForm.patchValue({ entityId: "" });
      return;
    }

    const roleNormalized = String(role).toUpperCase();
    const currentRoleNormalized = String(this.currentRole || "").toUpperCase();

    if (roleNormalized === currentRoleNormalized && this.currentRoleId != null) {
      // Auto-select current role id and disable the select so user can't change it
      this.reportForm.patchValue({ entityId: this.currentRoleId });
      this.reportForm.get("entityId")?.disable();

      // Provide a minimal entities array so the select has something to render.
      // Replace name with a nicer label if you can fetch display name.
      this.entities = [this.currentRoleId];

      // Also trigger entity change side-effects (e.g., loading websites)
      this.onRoleEntityChange();
    } else {
      // Different role: enable selection and fetch list
      this.reportForm.get("entityId")?.enable();
      this.reportForm.patchValue({ entityId: "" });
      this.entities = [];
      if (role) {
        this.loadEntitiesForRole(role);
      }
    }
  }

  // Loads entities list for the given role (used when role != currentRole)
  loadEntitiesForRole(role: string): void {
    this.loadingEntities = true;
    this.entities = [];

    this.userService.getByRole(this.currentRoleId, role.toUpperCase()).subscribe({
      next: (res: any) => {
        // Support multiple response shapes
        if (Array.isArray(res)) {
          this.entities = res;
        } else if (res?.data?.data) {
          this.entities = res.data.data;
        } else if (res?.data) {
          this.entities = Array.isArray(res.data) ? res.data : [res.data];
        } else {
          this.entities = [];
        }

        // Map missing names to a fallback
        this.entities = this.entities.map((entity: any) => ({
          id: entity.id ?? entity.userId ?? entity,
          name:
            entity.name ||
            entity.fullName ||
            entity.username ||
            entity.displayName ||
            `ID: ${entity.id ?? entity.userId ?? entity}`,
        }));

        this.loadingEntities = false;
      },
      error: (err) => {
        console.error("Error fetching entities:", err);
        this.entities = [];
        this.loadingEntities = false;
      },
    });
  }

  // kept for template compatibility if template calls onRoleChange()
  onRoleChange(role?: string): void {
    const r = role ?? this.reportForm.get("entityType")?.value;
    this.applyEntityAutoSelect(r);
  }

  // previously onEntityChange, now renamed to onRoleEntityChange to avoid confusion
  onRoleEntityChange(): void {
    const entityId = this.reportForm.get("entityId")?.value;
    const entityType = this.reportForm.get("entityType")?.value;

    if (!entityId || !entityType) {
      // nothing to load
      return;
    }

    // Load related data for the selected entity if needed.
    // If you previously used utilService to fetch websites, call it here.
    // Example (uncomment/adjust if utilService exists with same signature):
    // this.loadingEntities = true;
    // this.utilService.getWebsiteByRoleIdAndRoleName(entityId, entityType).subscribe(...)

    // For now, keep as-is (no-op) or implement website loading if required.
  }

  fetchReport(): void {
    // use getRawValue so disabled entityId is available when auto-selected
    const formValue = this.reportForm.getRawValue();

    // manual presence checks because entityId may be disabled (so validators won't run)
    if (!formValue.entityType || !formValue.entityId || !formValue.fromDate || !formValue.toDate) {
      this.markFormGroupTouched(this.reportForm);
      return;
    }

    // Validate dates - no future dates
    const today = new Date().toISOString().split("T")[0];
    if (formValue.fromDate > today || formValue.toDate > today) {
      alert("Future dates are not allowed");
      return;
    }

    this.loading = true;
    this.userGroups = [];

    const payload = {
      entityId: formValue.entityId,
      entityType: formValue.entityType,
      fromDate: formValue.fromDate,
      toDate: formValue.toDate,
    };

    this.workTimeReport.getWorkReportByDate(payload).subscribe({
      next: (res: any) => {
        this.processReportData(res);
        this.loading = false;
      },
      error: (err) => {
        console.error("Error fetching report:", err);
        this.loading = false;
      },
    });
  }

  private processReportData(data: any): void {
    this.userGroups = [];

    // Utility to create UserGroup from array of records
    const pushGroupFromRecords = (userId: string, recordsArray: any[]) => {
      if (!Array.isArray(recordsArray) || recordsArray.length === 0) return;

      const userName =
        recordsArray[0].userUsername ||
        recordsArray[0].username ||
        recordsArray[0].name ||
        `User ${userId}`;

      const normalizedRecords: WorkTimeRecord[] = recordsArray.map(
        (record: any) => {
          // raw minutes from backend if provided
          const rawMinutes =
            typeof record.workTimeInMinutes === "number"
              ? record.workTimeInMinutes
              : record.workTimeMinutes || null;

          // Prefer workTimeHHMM (like "00:01"), else convert rawMinutes to "Xh Ym"
          let workedTimeStr = "";
          if (record.workTimeHHMM) {
            // convert "HH:MM" -> "Xh Ym"
            const hhmmMatch = record.workTimeHHMM.match(/(\d+):(\d+)/);
            if (hhmmMatch) {
              const h = parseInt(hhmmMatch[1], 10);
              const m = parseInt(hhmmMatch[2], 10);
              workedTimeStr = `${h}h ${m}m`;
            } else {
              workedTimeStr = record.workTimeHHMM + ""; // fallback
            }
          } else if (rawMinutes !== null && rawMinutes !== undefined) {
            const h = Math.floor(rawMinutes / 60);
            const m = rawMinutes % 60;
            workedTimeStr = `${h}h ${m}m`;
          } else if (record.workTime || record.totalTime) {
            // if backend returns a formatted string (try to keep it)
            workedTimeStr = String(record.workTime || record.totalTime);
          } else {
            workedTimeStr = ""; // will fallback to calculateWorkedTime()
          }

          return {
            date: record.date || record.createdAt || "",
            clockIn: record.checkIn || record.startTime || "",
            clockOut: record.checkOut || record.endTime || "",
            workedTime: workedTimeStr,
            status: record.status || "COMPLETED",
            location: record.location || record.workLocation || "",
            // keep rawMinutes as numeric for robust summing
            rawMinutes:
              rawMinutes ??
              (record.workTimeHHMM
                ? (() => {
                    const mm = (
                      record.workTimeHHMM.match(/(\d+):(\d+)/) || []
                    ).slice(1);
                    if (mm.length === 2)
                      return parseInt(mm[0], 10) * 60 + parseInt(mm[1], 10);
                    return null;
                  })()
                : null),
          } as WorkTimeRecord & { rawMinutes?: number | null };
        }
      );

      this.userGroups.push({
        userId,
        userName,
        records: normalizedRecords,
        expanded: true,
      });
    };

    // If data is an array -> group by userId
    if (Array.isArray(data)) {
      const groups = new Map<string, any[]>();
      data.forEach((rec: any) => {
        const uid = rec.userId || rec.user || rec.user_id || "unknown";
        if (!groups.has(uid)) groups.set(uid, []);
        groups.get(uid)!.push(rec);
      });
      groups.forEach((arr, uid) => pushGroupFromRecords(uid, arr));
    }
    // If data is an object map keyed by userId
    else if (data && typeof data === "object") {
      // If it's already { userId: [records], ... }
      let isMapShape = false;
      for (const k of Object.keys(data)) {
        if (Array.isArray(data[k])) {
          isMapShape = true;
          pushGroupFromRecords(k, data[k]);
        }
      }
      // if not map-shaped but is a single-user object with array in .data or .records
      if (!isMapShape) {
        // try known wrappers
        if (Array.isArray(data.data)) {
          // data.data could be array of records
          const arr = data.data as any[];
          const groups = new Map<string, any[]>();
          arr.forEach((rec) => {
            const uid = rec.userId || rec.user || "unknown";
            if (!groups.has(uid)) groups.set(uid, []);
            groups.get(uid)!.push(rec);
          });
          groups.forEach((a, uid) => pushGroupFromRecords(uid, a));
        } else if (Array.isArray(data.records)) {
          pushGroupFromRecords(
            data.userId || data.user || "unknown",
            data.records
          );
        } else {
          // Last-resort: treat object as single record
          pushGroupFromRecords(data.userId || data.user || "unknown", [data]);
        }
      }
    }

    // Sort users by name
    this.userGroups.sort((a, b) =>
      (a.userName || "").localeCompare(b.userName || "")
    );

    if (this.userGroups.length === 0) {
      console.warn("No valid data found in response");
    }

    this.calculateTotals();
  }

  get totalRecords(): number {
    return this.userGroups.reduce(
      (total, user) => total + user.records.length,
      0
    );
  }

  calculateTotalWorkedTime(records: WorkTimeRecord[]): string {
    // attempt to use rawMinutes if present (recommended)
    let totalMinutes = 0;
    records.forEach((record: any) => {
      if (typeof record.rawMinutes === "number") {
        totalMinutes += record.rawMinutes;
        return;
      }
      // If workedTime is in "Xh Ym" format
      const hmMatch = (record.workedTime || "").match(/(\d+)\s*h\s*(\d+)\s*m/);
      if (hmMatch) {
        totalMinutes +=
          parseInt(hmMatch[1], 10) * 60 + parseInt(hmMatch[2], 10);
        return;
      }
      // If workedTime in "HH:MM"
      const mmMatch = (record.workedTime || "").match(/(\d+):(\d+)/);
      if (mmMatch) {
        totalMinutes +=
          parseInt(mmMatch[1], 10) * 60 + parseInt(mmMatch[2], 10);
        return;
      }
      // fallback: try calculate from clockIn/clockOut
      const fallback = this.calculateWorkedTime(
        record.clockIn,
        record.clockOut
      );
      const fallbackMatch = fallback.match(/(\d+)h\s(\d+)m/);
      if (fallbackMatch) {
        totalMinutes +=
          parseInt(fallbackMatch[1], 10) * 60 + parseInt(fallbackMatch[2], 10);
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }

  calculateWorkedTime(clockIn: string, clockOut: string): string {
    if (!clockIn || !clockOut) return "0h 0m";

    // Try parse full ISO first, otherwise try as time-of-day
    let inDate = new Date(clockIn);
    let outDate = new Date(clockOut);

    if (isNaN(inDate.getTime())) {
      inDate = new Date(`2000-01-01T${clockIn}`);
    }
    if (isNaN(outDate.getTime())) {
      outDate = new Date(`2000-01-01T${clockOut}`);
    }
    if (isNaN(inDate.getTime()) || isNaN(outDate.getTime())) return "0h 0m";

    const diffMs = outDate.getTime() - inDate.getTime();
    if (diffMs < 0) return "0h 0m";

    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    return `${hours}h ${minutes}m`;
  }

  calculateAverageWorkedTime(records: WorkTimeRecord[]): string {
    if (records.length === 0) return "0h 0m";

    const totalTime = this.calculateTotalWorkedTime(records);
    const match = totalTime.match(/(\d+)h\s(\d+)m/);
    if (match) {
      const totalMinutes = parseInt(match[1]) * 60 + parseInt(match[2]);
      const avgMinutes = Math.round(totalMinutes / records.length);

      const hours = Math.floor(avgMinutes / 60);
      const minutes = avgMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
    return "0h 0m";
  }

  calculateOverallAverage(): string {
    if (this.userGroups.length === 0) return "0h 0m";

    let totalMinutes = 0;
    let totalRecords = 0;

    this.userGroups.forEach((user) => {
      user.records.forEach((record) => {
        const time =
          record.workedTime ||
          this.calculateWorkedTime(record.clockIn, record.clockOut);
        const match = time.match(/(\d+)h\s(\d+)m/);
        if (match) {
          totalMinutes += parseInt(match[1]) * 60 + parseInt(match[2]);
          totalRecords++;
        }
      });
    });

    if (totalRecords === 0) return "0h 0m";

    const avgMinutes = Math.round(totalMinutes / totalRecords);
    const hours = Math.floor(avgMinutes / 60);
    const minutes = avgMinutes % 60;
    return `${hours}h ${minutes}m`;
  }

  formatDate(date: string): string {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  formatTime(time: string): string {
    if (!time) return "--:--";
    const t = this.isoToTimePart(time);
    return t || "--:--";
  }

  private isoToTimePart(ts: string): string {
    // Accept either 'HH:mm:ss' or full ISO '2025-12-16T12:57:12.435793' or Date object
    if (!ts) return "";
    try {
      // If already contains 'T' or looks like a full ISO, parse directly
      const date = ts.includes("T") ? new Date(ts) : new Date(`2000-01-01T${ts}`);
      if (isNaN(date.getTime())) return "";
      // Return HH:MM (24h)
      return date.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch (e) {
      return "";
    }
  }

  getStatusBadgeClass(status: any): any {
    const statusClassMap: { [key: string]: any } = {
      COMPLETED:
        "px-3 py-1 text-sm font-semibold bg-green-100 text-green-800 rounded-full",
      PENDING:
        "px-3 py-1 text-sm font-semibold bg-yellow-100 text-yellow-800 rounded-full",
      ABSENT:
        "px-3 py-1 text-sm font-semibold bg-red-100 text-red-800 rounded-full",
      HALF_DAY:
        "px-3 py-1 text-sm font-semibold bg-blue-100 text-blue-800 rounded-full",
      default:
        "px-3 py-1 text-sm font-semibold bg-gray-100 text-gray-800 rounded-full",
    };

    return statusClassMap[status];
  }

  toggleUserGroup(index: number): void {
    this.userGroups[index].expanded = !this.userGroups[index].expanded;
  }

  expandAll(): void {
    this.userGroups.forEach((user) => (user.expanded = true));
  }

  collapseAll(): void {
    this.userGroups.forEach((user) => (user.expanded = false));
  }

  exportToExcel(): void {
    const data: any[] = [];

    this.userGroups.forEach((user) => {
      user.records.forEach((record) => {
        data.push({
          "User ID": user.userId,
          "User Name": user.userName,
          Date: this.formatDate(record.date),
          "Clock In": this.formatTime(record.clockIn),
          "Clock Out": this.formatTime(record.clockOut),
          "Worked Time":
            record.workedTime ||
            this.calculateWorkedTime(record.clockIn, record.clockOut),
          Status: record.status,
          Location: record.location,
        });
      });
    });

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Work Time Report");

    const fileName = `Work_Time_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  downloadPDF(): void {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text("Work Time Report", 14, 22);

    // Date range
    doc.setFontSize(11);
    const fromDate = this.reportForm.get("fromDate")?.value;
    const toDate = this.reportForm.get("toDate")?.value;
    doc.text(
      `Date Range: ${this.formatDate(fromDate)} to ${this.formatDate(toDate)}`,
      14,
      32
    );

    // Summary
    doc.text(`Total Users: ${this.userGroups.length}`, 14, 42);
    doc.text(`Total Records: ${this.totalRecords}`, 14, 47);

    let yPos = 60;

    // For each user
    this.userGroups.forEach((user, index) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }

      // User header
      doc.setFontSize(14);
      doc.setTextColor(0, 51, 102);
      doc.text(`${user.userName} (ID: ${user.userId})`, 14, yPos);

      // User summary
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(
        `Total Worked: ${this.calculateTotalWorkedTime(user.records)}`,
        14,
        yPos + 7
      );

      yPos += 15;

      // Table headers
      const headers = [["Date", "Clock In", "Clock Out", "Worked Time", "Status"]];
      const rows = user.records.map((record) => [
        this.formatDate(record.date),
        this.formatTime(record.clockIn),
        this.formatTime(record.clockOut),
        record.workedTime || this.calculateWorkedTime(record.clockIn, record.clockOut),
        record.status,
      ]);

      autoTable(doc, {
        head: headers,
        body: rows,
        startY: yPos,
        theme: "grid",
        headStyles: { fillColor: [0, 51, 102] },
        margin: { left: 14, right: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    });

    doc.save(`Work_Time_Report_${new Date().toISOString().split("T")[0]}.pdf`);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private calculateTotals(): void {
    // Additional calculations if needed
  }

  clearForm(): void {
    // ensure entityId control is enabled before resetting so value is cleared
    this.reportForm.get("entityId")?.enable();

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    this.reportForm.reset({
      entityType: "",
      entityId: "",
      fromDate: firstDay.toISOString().split("T")[0],
      toDate: today.toISOString().split("T")[0],
    });

    this.entities = [];
    this.userGroups = [];

    // re-apply auto selection in case default entityType matches current role
    const role = this.reportForm.get("entityType")?.value;
    this.applyEntityAutoSelect(role);
  }
}
