import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ChiefManualService } from "../../pages/services/chief-manual.service";
import { UserStateService } from "../../store/user-state.service";

@Component({
  selector: "app-branch-register",
  templateUrl: "./branch-register.component.html",
  styleUrls: ["./branch-register.component.css"], // corrected to styleUrls
})
export class BranchRegisterComponent implements OnInit {
  branchName = "";
  email = "";
  mobile = "";
  username = "";
  password = "";
  address = "";

  chiefId: any;
  portalId: any;

  // null = not checked yet, true/false = result
  autoEnabled: boolean | null = null;
  loading = false;

  constructor(
    private ChiefManualService: ChiefManualService,
    private userStateService: UserStateService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // prefer route params if present, tpwise fall back
    const routeChiefId = this.route.snapshot.paramMap.get("chiefId");
    const routePortalId = this.route.snapshot.paramMap.get("portalId");

    this.chiefId = routeChiefId;
    this.portalId = routePortalId;

    // call the API to get auto status
    this.checkAutoStatus();
  }

  private checkAutoStatus() {
    if (!this.chiefId || !this.portalId) {
      // if missing ids treat as disabled
      this.autoEnabled = false;
      return;
    }

    this.loading = true;
    this.autoEnabled = null;

    this.ChiefManualService.getManualStatus(
      this.chiefId,
      this.portalId,
    ).subscribe({
      next: (res: any) => {
        // assume service returns boolean or something truthy/falsy at res
        this.autoEnabled = !!res;
        this.loading = false;
      },
      error: (err: any) => {
        console.error("getManualStatus error:", err);
        // consider false on error (you may want different behaviour)
        this.autoEnabled = false;
        this.loading = false;
      },
    });
  }

  onSubmit() {
    if (!this.autoEnabled) {
      alert("Auto mode OFF. Submission not allowed.");
      return;
    }

    const payload = {
      name: this.branchName,
      email: this.email,
      phone: this.mobile,
      username: this.username,
      password: this.password,
    };

    this.ChiefManualService.performManualAction(
      this.chiefId,
      this.portalId,
      payload,
    ).subscribe({
      next: (res: any) => {
        alert("Data submitted successfully");
        this.onClear();
      },
      error: (err: any) => {
        console.error(err);
        alert("Submission failed");
      },
    });
  }

  onClear() {
    this.branchName = "";
    this.email = "";
    this.mobile = "";
    this.username = "";
    this.password = "";
  }
}
