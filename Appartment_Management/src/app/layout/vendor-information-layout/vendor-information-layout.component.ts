import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, HostListener, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-vendor-information-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './vendor-information-layout.component.html',
  styleUrl: './vendor-information-layout.component.css'
})
export class VendorInformationLayoutComponent implements OnInit {
  isSidebarCollapsed = false;
  isNotificationsOpen = false;
  isProfileOpen = false;
  isSidebarOpen = false;
  name: string = 'User';

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.checkScreenWidth();

    if (isPlatformBrowser(this.platformId)) {
      const storedName = localStorage.getItem('userName');
      if (storedName) {
        this.name = storedName;
      }
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.checkScreenWidth();
  }

  checkScreenWidth(): void {
    if (typeof window !== 'undefined') {
      const isMobile = window.innerWidth <= 768;
      this.isSidebarOpen = isMobile ? this.isSidebarOpen : false;
      this.isSidebarCollapsed = isMobile ? false : true;
    }
  }

  toggleSidebar(): void {
    if (typeof window !== 'undefined') {
      if (window.innerWidth <= 768) {
        this.isSidebarOpen = !this.isSidebarOpen;
      } else {
        this.isSidebarCollapsed = !this.isSidebarCollapsed;
      }
    }
  }

toggleNotifications(event?: Event): void {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  this.isNotificationsOpen = !this.isNotificationsOpen;
  this.isProfileOpen = false;
}

toggleProfile(event?: Event): void {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  this.isProfileOpen = !this.isProfileOpen;
  this.isNotificationsOpen = false;
}

isMobileMenuOpen = false;

toggleMobileMenu() {
  this.isMobileMenuOpen = !this.isMobileMenuOpen;

  // Optionally add/remove class from body or sidebar
  const body = document.querySelector('body');
  if (body) {
    body.classList.toggle('mobile-menu-active', this.isMobileMenuOpen);
  }
}



  logout(): void {
    localStorage.clear();
    this.router.navigate(['/sign-in']);
  }

  @HostListener('document:click', ['$event'])
  onOutsideClick(event: MouseEvent): void {
    const notificationsElement = document.querySelector('.dropdown-menu.notification');
    const notificationsTrigger = document.querySelector('.nav-item.dropdown:nth-child(2) > a');

    const profileElement = document.querySelector('.dropdown-menu.profile-notification');
    const profileTrigger = document.querySelector('.nav-item.dropdown:last-child > a');

    if (
      notificationsElement &&
      this.isNotificationsOpen &&
      !notificationsElement.contains(event.target as Node) &&
      notificationsTrigger &&
      !notificationsTrigger.contains(event.target as Node)
    ) {
      this.isNotificationsOpen = false;
    }

    if (
      profileElement &&
      this.isProfileOpen &&
      !profileElement.contains(event.target as Node) &&
      profileTrigger &&
      !profileTrigger.contains(event.target as Node)
    ) {
      this.isProfileOpen = false;
    }
  }
}
