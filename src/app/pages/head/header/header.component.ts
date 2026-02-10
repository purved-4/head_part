import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { UserStateService } from '../../../store/user-state.service';

@Component({
  selector: 'head-header',
  templateUrl: './header.component.html'
})
export class HeadHeaderComponent implements OnInit {
  @Input() sidebarCollapsed = false;
  @Output() toggleSidebar = new EventEmitter<boolean>();

  currentUser: any = 'User';
  showUserMenu = false;

  constructor(private authService: AuthService,private userStateService:UserStateService) {}

  ngOnInit() {
       this.currentUser = this.userStateService.getRole();
  
   
  }

  onToggleSidebar() {
    this.toggleSidebar.emit(!this.sidebarCollapsed);
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  getFirstLetter(username: string): string {
    return username ? username.toUpperCase() : 'U';
  }

  logout() {
    this.authService.logout();
  }
}