import { Component } from '@angular/core';

@Component({
  selector: 'app-head-nav-dashboard-layout',
  templateUrl: './head-nav-dashboard-layout.component.html',
  styleUrls: ['./head-nav-dashboard-layout.component.css']
})
export class HeadNavDashboardLayoutComponent {
  sidebarCollapsed = false; // currently not used by sidebar, but kept for future
  secondaryPanelOpen = false; // tracks explicit open state from sidebar
  showSettings = false;
  pageTitle = 'Dashboard'; // derive from route or service
  userName = 'John Doe';   // get from auth service

  readonly PRIMARY_WIDTH = 80;
  readonly PANEL_WIDTH = 320;

  get mainMargin(): number {
    // Primary sidebar is always 80px wide.
    // If secondary panel is explicitly open, add its width.
    return this.PRIMARY_WIDTH + (this.secondaryPanelOpen ? this.PANEL_WIDTH : 0);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    // If we implement collapsed primary sidebar later, adjust margin accordingly.
  }

  onSecondaryPanelChange(open: boolean): void {
    this.secondaryPanelOpen = open;
  }

  openSettings(): void {
    this.showSettings = true;
  }

  closeSettings(): void {
    this.showSettings = false;
  }

  onSearch(term: string): void {
    // handle search
  }
}