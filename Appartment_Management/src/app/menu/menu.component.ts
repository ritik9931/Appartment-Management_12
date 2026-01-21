import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css'] // ✅ Corrected from "styleUrl" to "styleUrls"
})
export class MenuComponent {
  menuCards = [
    {
      title: 'Profile Management',
      image: 'assets/images/auth/profile-management.png',
      route: '/menu/dashboard',
      bgClass: 'bg-gradient-income'
    },
    {
      title: 'Income & Expenditure',
      image: 'assets/images/auth/income-expenses.png',
      route: '/income/income-dashboard',
      bgClass: 'bg-gradient-income'
    },
    {
      title: 'Complaint',
      image: 'assets/images/auth/complaint-feedback.png',
      route: '/menu/complaint-dashboard',
      bgClass: 'bg-gradient-complaint'
    },
    {
      title: 'Notice Board & Meeting',
      image: 'assets/images/auth/notice-board.png',
      route: '/menu/notice-board-dashboard',
      bgClass: 'bg-gradient-notice'
    },
    {
      title: 'Vendor Information',
      image: 'assets/images/auth/staff-&-vendor.png',
      route: '/menu/vendor-information-dashboard',
      bgClass: 'bg-gradient-staff'
    },
    {
      title: 'Reports & Analytics',
      image: 'assets/images/auth/report-analysis.png',
      route: '/menu/report-analytics-dashboard',
      bgClass: 'bg-gradient-reports'
    }
  ];
}
