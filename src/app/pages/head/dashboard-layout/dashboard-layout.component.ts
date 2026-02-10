import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'head-dashboard-layout',
  templateUrl: './dashboard-layout.component.html',
  styleUrls: ['./dashboard-layout.component.css']
})
export class HeadDashboardLayoutComponent implements OnInit {
  sidebarCollapsed = false;

  constructor() {}

  ngOnInit() {}

  onSidebarToggle(collapsed: boolean) {
    this.sidebarCollapsed = collapsed;
  }
}