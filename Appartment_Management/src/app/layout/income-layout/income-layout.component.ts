import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, HostListener, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-income-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './income-layout.component.html',
  styleUrls: ['./income-layout.component.css']
})
export class IncomeLayoutComponent implements OnInit {
  isSidebarCollapsed = false;
  isNotificationsOpen = false; 
  isProfileOpen = false;
  isSidebarOpen: boolean = false; 
  name: String = 'User'

  constructor(private router: Router, @Inject(PLATFORM_ID) private platformId: Object) {}

   ngOnInit() {
                this.checkScreenWidth();
                if (isPlatformBrowser(this.platformId)) {
                  const storedName = localStorage.getItem('userName');
                  if (storedName) {
                    this.name = storedName;
                  }
                }
              }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.checkScreenWidth();
  }

  checkScreenWidth() {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      this.isSidebarCollapsed = false;
    } else if (typeof window !== 'undefined') {
      this.isSidebarOpen = false; // Reset mobile open state on larger screens
    }
  }

  toggleSidebar(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      this.isSidebarOpen = !this.isSidebarOpen;
      const navbar = document.querySelector('.pcoded-navbar');
      if (navbar) {
        navbar.classList.toggle('open');
      }
    } else if (typeof window !== 'undefined') {
      this.isSidebarCollapsed = !this.isSidebarCollapsed;
    }
  }

  toggleNotifications(): void {
    this.isNotificationsOpen = !this.isNotificationsOpen;
    this.isProfileOpen = false;
  }

  toggleProfile(): void {
    this.isProfileOpen = !this.isProfileOpen;
    this.isNotificationsOpen = false;
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/sign-in']);
  }

  // Optional: Close dropdowns on outside click
  @HostListener('document:click', ['$event'])
  onOutsideClick(event: MouseEvent) {
    const notificationsElement = document.querySelector('.dropdown-menu.notification');
    const notificationsTrigger = document.querySelector('.nav-item.dropdown:nth-child(2) > a');

    const profileElement = document.querySelector('.dropdown-menu.profile-notification');
    const profileTrigger = document.querySelector('.nav-item.dropdown:last-child > a');

    if (notificationsElement && this.isNotificationsOpen &&
        !notificationsElement.contains(event.target as Node) &&
        notificationsTrigger && !notificationsTrigger.contains(event.target as Node)) {
      this.isNotificationsOpen = false;
    }

    if (profileElement && this.isProfileOpen &&
        !profileElement.contains(event.target as Node) &&
        profileTrigger && !profileTrigger.contains(event.target as Node)) {
      this.isProfileOpen = false;
    }
  }
}
