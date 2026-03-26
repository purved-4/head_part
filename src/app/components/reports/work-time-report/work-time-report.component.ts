import { Component, OnInit } from "@angular/core";
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
} from "@angular/forms";
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

  // Date range options
  months = [
    { value: 1, name: "January" },
    { value: 2, name: "February" },
    { value: 3, name: "March" },
    { value: 4, name: "April" },
    { value: 5, name: "May" },
    { value: 6, name: "June" },
    { value: 7, name: "July" },
    { value: 8, name: "August" },
    { value: 9, name: "September" },
    { value: 10, name: "October" },
    { value: 11, name: "November" },
    { value: 12, name: "December" },
  ];
  years: number[] = [];

  constructor(
    private balanceHistoryService: TransactionHistoryService,
    private userService: UserService,
    private fb: FormBuilder,
    private stateService: UserStateService,
    private utilService: UtilsServiceService,
    private workTimeReport: WorkReportsService,
  ) {
    const today = new Date();
    this.maxDate = today.toISOString().split("T")[0];

    this.reportForm = this.fb.group(
      {
        entityType: ["", Validators.required],
        entityId: ["", Validators.required],
        dateRangeMode: ["custom"],
        fromDate: [""],
        toDate: [""],
        fromMonth: [""],
        toMonth: [""],
        selectedYear: [""],
      },
      { validators: [this.dateRangeValidator, this.monthRangeValidator] },
    );
  }

  ngOnInit(): void {
    this.entityTypes = this.utilService.getRoleForDownLevelWithCurrentRoleIdAll(
      this.stateService.getRole(),
    );

    this.currentUserId = this.stateService.getUserId();
    this.currentRole = this.stateService.getRole();
    this.currentRoleId = this.stateService.getCurrentEntityId();

    this.generateYears();
    this.setDefaultDates();

    const initialRole = this.reportForm.get("entityType")?.value;
    this.applyEntityAutoSelect(initialRole);

    this.reportForm.get("entityType")?.valueChanges.subscribe((role) => {
      this.applyEntityAutoSelect(role);
    });

    this.reportForm.get("entityId")?.valueChanges.subscribe(() => {
      this.onRoleEntityChange();
    });

    this.reportForm.get("dateRangeMode")?.valueChanges.subscribe((mode) => {
      this.updateDateValidators(mode);
    });
    this.updateDateValidators(this.reportForm.get("dateRangeMode")?.value);
  }

  generateYears(): void {
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= 2000; year--) {
      this.years.push(year);
    }
  }

  setDefaultDates(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    this.reportForm.patchValue({
      fromDate: firstDay.toISOString().split("T")[0],
      toDate: today.toISOString().split("T")[0],
      dateRangeMode: "custom",
    });
  }

  dateRangeValidator(group: AbstractControl): { [key: string]: any } | null {
    const mode = group.get("dateRangeMode")?.value;
    if (mode !== "custom") return null;
    const fromDate = group.get("fromDate")?.value;
    const toDate = group.get("toDate")?.value;

    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      if (from > to) {
        return { dateRange: true };
      }
    }
    return null;
  }

  monthRangeValidator(group: AbstractControl): { [key: string]: any } | null {
    const mode = group.get("dateRangeMode")?.value;
    if (mode !== "month") return null;
    const fromMonth = group.get("fromMonth")?.value;
    const toMonth = group.get("toMonth")?.value;
    if (
      fromMonth &&
      toMonth &&
      parseInt(fromMonth, 10) > parseInt(toMonth, 10)
    ) {
      return { monthRangeInvalid: true };
    }
    return null;
  }

  updateDateValidators(mode: string): void {
    const fromDateControl = this.reportForm.get("fromDate");
    const toDateControl = this.reportForm.get("toDate");
    const fromMonthControl = this.reportForm.get("fromMonth");
    const toMonthControl = this.reportForm.get("toMonth");
    const yearControl = this.reportForm.get("selectedYear");

    fromDateControl?.clearValidators();
    toDateControl?.clearValidators();
    fromMonthControl?.clearValidators();
    toMonthControl?.clearValidators();
    yearControl?.clearValidators();

    if (mode === "custom") {
      fromDateControl?.setValidators([Validators.required]);
      toDateControl?.setValidators([Validators.required]);
    } else if (mode === "month") {
      fromMonthControl?.setValidators([Validators.required]);
      toMonthControl?.setValidators([Validators.required]);
      yearControl?.setValidators([Validators.required]);
    } else if (mode === "year") {
      yearControl?.setValidators([Validators.required]);
    }

    fromDateControl?.updateValueAndValidity();
    toDateControl?.updateValueAndValidity();
    fromMonthControl?.updateValueAndValidity();
    toMonthControl?.updateValueAndValidity();
    yearControl?.updateValueAndValidity();
    this.reportForm.updateValueAndValidity();
  }

  applyEntityAutoSelect(role: string | null | undefined): void {
    if (!role) {
      this.entities = [];
      this.reportForm.get("entityId")?.enable();
      this.reportForm.patchValue({ entityId: "" });
      return;
    }

    const roleNormalized = String(role).toUpperCase();
    const currentRoleNormalized = String(this.currentRole || "").toUpperCase();

    if (
      roleNormalized === currentRoleNormalized &&
      this.currentRoleId != null
    ) {
      this.reportForm.patchValue({ entityId: this.currentRoleId });
      this.reportForm.get("entityId")?.disable();
      this.entities = [{ id: this.currentRoleId, name: "Current User" }];
      this.onRoleEntityChange();
    } else {
      this.reportForm.get("entityId")?.enable();
      this.reportForm.patchValue({ entityId: "" });
      this.entities = [];
      if (role) {
        this.loadEntitiesForRole(role);
      }
    }
  }

  loadEntitiesForRole(role: string): void {
    this.loadingEntities = true;
    this.entities = [];

    this.userService
      .getByRole(this.currentRoleId, role.toUpperCase())
      .subscribe({
        next: (res: any) => {
          if (Array.isArray(res)) {
            this.entities = res;
          } else if (res?.data?.data) {
            this.entities = res.data.data;
          } else if (res?.data) {
            this.entities = Array.isArray(res.data) ? res.data : [res.data];
          } else {
            this.entities = [];
          }

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

  onRoleChange(): void {
    const role = this.reportForm.get("entityType")?.value;
    this.applyEntityAutoSelect(role);
  }

  onRoleEntityChange(): void {
    // Placeholder for any side effects when entity changes (e.g., load portals)
  }

  fetchReport(): void {
    const formValue = this.reportForm.getRawValue();

    if (!formValue.entityType || !formValue.entityId) {
      this.markFormGroupTouched(this.reportForm);
      return;
    }

    // Compute actual from and to dates based on mode
    let fromDate: string, toDate: string;
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    switch (formValue.dateRangeMode) {
      case "custom":
        fromDate = formValue.fromDate;
        toDate = formValue.toDate;
        break;
      case "month":
        const year = parseInt(formValue.selectedYear, 10);
        const fromMonth = parseInt(formValue.fromMonth, 10);
        const toMonth = parseInt(formValue.toMonth, 10);
        fromDate = new Date(year, fromMonth - 1, 1).toISOString().split("T")[0];
        if (year === currentYear && toMonth === currentMonth) {
          toDate = today.toISOString().split("T")[0];
        } else {
          const lastDay = new Date(year, toMonth, 0).getDate();
          toDate = new Date(year, toMonth - 1, lastDay)
            .toISOString()
            .split("T")[0];
        }
        break;
      case "year":
        const selYear = parseInt(formValue.selectedYear, 10);
        fromDate = new Date(selYear, 0, 1).toISOString().split("T")[0];
        if (selYear === currentYear) {
          toDate = today.toISOString().split("T")[0];
        } else {
          toDate = new Date(selYear, 11, 31).toISOString().split("T")[0];
        }
        break;
      default:
        fromDate = formValue.fromDate;
        toDate = formValue.toDate;
    }

    // Future date check
    const todayISODate = this.maxDate;
    if (fromDate > todayISODate || toDate > todayISODate) {
      alert("Future dates are not allowed");
      return;
    }

    this.loading = true;
    this.userGroups = [];

    const payload = {
      entityId: formValue.entityId,
      entityType: formValue.entityType,
      fromDate: fromDate,
      toDate: toDate,
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

    const pushGroupFromRecords = (userId: string, recordsArray: any[]) => {
      if (!Array.isArray(recordsArray) || recordsArray.length === 0) return;

      const userName =
        recordsArray[0].userUsername ||
        recordsArray[0].username ||
        recordsArray[0].name ||
        `User ${userId}`;

      const normalizedRecords: WorkTimeRecord[] = recordsArray.map(
        (record: any) => {
          const rawMinutes =
            typeof record.workTimeInMinutes === "number"
              ? record.workTimeInMinutes
              : record.workTimeMinutes || null;

          let workedTimeStr = "";
          if (record.workTimeHHMM) {
            const hhmmMatch = record.workTimeHHMM.match(/(\d+):(\d+)/);
            if (hhmmMatch) {
              const h = parseInt(hhmmMatch[1], 10);
              const m = parseInt(hhmmMatch[2], 10);
              workedTimeStr = `${h}h ${m}m`;
            } else {
              workedTimeStr = record.workTimeHHMM + "";
            }
          } else if (rawMinutes !== null && rawMinutes !== undefined) {
            const h = Math.floor(rawMinutes / 60);
            const m = rawMinutes % 60;
            workedTimeStr = `${h}h ${m}m`;
          } else if (record.workTime || record.totalTime) {
            workedTimeStr = String(record.workTime || record.totalTime);
          } else {
            workedTimeStr = "";
          }

          return {
            date: record.date || record.createdAt || "",
            clockIn: record.checkIn || record.startTime || "",
            clockOut: record.checkOut || record.endTime || "",
            workedTime: workedTimeStr,
            status: record.status || "COMPLETED",
            location: record.location || record.workLocation || "",
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
        },
      );

      this.userGroups.push({
        userId,
        userName,
        records: normalizedRecords,
        expanded: true,
      });
    };

    if (Array.isArray(data)) {
      const groups = new Map<string, any[]>();
      data.forEach((rec: any) => {
        const uid = rec.userId || rec.user || rec.user_id || "unknown";
        if (!groups.has(uid)) groups.set(uid, []);
        groups.get(uid)!.push(rec);
      });
      groups.forEach((arr, uid) => pushGroupFromRecords(uid, arr));
    } else if (data && typeof data === "object") {
      let isMapShape = false;
      for (const k of Object.keys(data)) {
        if (Array.isArray(data[k])) {
          isMapShape = true;
          pushGroupFromRecords(k, data[k]);
        }
      }
      if (!isMapShape) {
        if (Array.isArray(data.data)) {
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
            data.records,
          );
        } else {
          pushGroupFromRecords(data.userId || data.user || "unknown", [data]);
        }
      }
    }

    this.userGroups.sort((a, b) =>
      (a.userName || "").localeCompare(b.userName || ""),
    );

    if (this.userGroups.length === 0) {
      console.warn("No valid data found in response");
    }

    this.calculateTotals();
  }

  get totalRecords(): number {
    return this.userGroups.reduce(
      (total, user) => total + user.records.length,
      0,
    );
  }

  calculateTotalWorkedTime(records: WorkTimeRecord[]): string {
    let totalMinutes = 0;
    records.forEach((record: any) => {
      if (typeof record.rawMinutes === "number") {
        totalMinutes += record.rawMinutes;
        return;
      }
      const hmMatch = (record.workedTime || "").match(/(\d+)\s*h\s*(\d+)\s*m/);
      if (hmMatch) {
        totalMinutes +=
          parseInt(hmMatch[1], 10) * 60 + parseInt(hmMatch[2], 10);
        return;
      }
      const mmMatch = (record.workedTime || "").match(/(\d+):(\d+)/);
      if (mmMatch) {
        totalMinutes +=
          parseInt(mmMatch[1], 10) * 60 + parseInt(mmMatch[2], 10);
        return;
      }
      const fallback = this.calculateWorkedTime(
        record.clockIn,
        record.clockOut,
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
    if (!ts) return "";
    try {
      const date = ts.includes("T")
        ? new Date(ts)
        : new Date(`2000-01-01T${ts}`);
      if (isNaN(date.getTime())) return "";
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

    doc.setFontSize(18);
    doc.text("Work Time Report", 14, 22);

    doc.setFontSize(11);
    const fromDate = this.reportForm.get("fromDate")?.value;
    const toDate = this.reportForm.get("toDate")?.value;
    doc.text(
      `Date Range: ${this.formatDate(fromDate)} to ${this.formatDate(toDate)}`,
      14,
      32,
    );

    doc.text(`Total Users: ${this.userGroups.length}`, 14, 42);
    doc.text(`Total Records: ${this.totalRecords}`, 14, 47);

    let yPos = 60;

    this.userGroups.forEach((user, index) => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(0, 51, 102);
      doc.text(`${user.userName} (ID: ${user.userId})`, 14, yPos);

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(
        `Total Worked: ${this.calculateTotalWorkedTime(user.records)}`,
        14,
        yPos + 7,
      );

      yPos += 15;

      const headers = [
        ["Date", "Clock In", "Clock Out", "Worked Time", "Status"],
      ];
      const rows = user.records.map((record) => [
        this.formatDate(record.date),
        this.formatTime(record.clockIn),
        this.formatTime(record.clockOut),
        record.workedTime ||
          this.calculateWorkedTime(record.clockIn, record.clockOut),
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
    this.reportForm.get("entityId")?.enable();

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    this.reportForm.reset({
      entityType: "",
      entityId: "",
      dateRangeMode: "custom",
      fromDate: firstDay.toISOString().split("T")[0],
      toDate: today.toISOString().split("T")[0],
      fromMonth: "",
      toMonth: "",
      selectedYear: "",
    });

    this.entities = [];
    this.userGroups = [];

    const role = this.reportForm.get("entityType")?.value;
    this.applyEntityAutoSelect(role);
  }

  getMonthRangeError(): boolean {
    return (
      this.reportForm.hasError("monthRangeInvalid") &&
      this.reportForm.get("dateRangeMode")?.value === "month"
    );
  }
}
