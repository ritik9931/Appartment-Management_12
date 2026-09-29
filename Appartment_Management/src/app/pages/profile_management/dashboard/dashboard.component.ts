import { Component, OnInit } from '@angular/core';
import {
  CommonModule, NgIf, NgFor, CurrencyPipe, DatePipe, DecimalPipe
} from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { forkJoin } from 'rxjs';

interface ResidentProfileForDashboard {
  userId: string;
  name: string;
  flatNumber: string;
  userType: string;
  currentResident: string;
  contactNumber: string;
  outstandingAmount: number;
  periodOfDefault: string;
  lastPaymentDate: Date;
}

interface ApiResponse {
  message: string;
  status: number;
  Data: any;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, HttpClientModule,
    NgIf, NgFor, DatePipe, DecimalPipe
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  totalResidents = 0;
  totalOwners = 0;
  totalTenants = 0;
  totalOutstandingDues = 0;
  numberOfDefaulters = 0;

  private allResidentsData: any[] = [];
  defaulterList: ResidentProfileForDashboard[] = [];
  filteredDefaulters: ResidentProfileForDashboard[] = [];

  searchTerm = '';
  filterUserType: '' | 'Owner' | 'Tenant' = '';

  private residentBaseUrl = 'https://www.nomad.org.in/rkt/api/rkt';

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchDashboardData();
  }

  fetchDashboardData(): void {
    const userProfile$ = this.http.get<ApiResponse>(`${this.residentBaseUrl}/GetAllUserProfile`);
    const defaulter$ = this.http.get<ApiResponse>(`${this.residentBaseUrl}/GetDefaulterMaintenance`);

    forkJoin([userProfile$, defaulter$]).subscribe({
      next: ([userResponse, defaulterResponse]) => {
        const userData = userResponse?.Data?.owner;
        const defaulterData = defaulterResponse?.Data;

        if (
          userResponse.status === 200 &&
          defaulterResponse.status === 200 &&
          Array.isArray(userData) &&
          Array.isArray(defaulterData)
        ) {
          const userMap = new Map<string, any>();
          userData.forEach(user => userMap.set(user.user_id, user));
          this.allResidentsData = userData;

          const defaulterGroups = new Map<string, string[]>();
          defaulterData.forEach(entry => {
            const id = entry.user_id;
            if (!defaulterGroups.has(id)) {
              defaulterGroups.set(id, []);
            }
            defaulterGroups.get(id)!.push(entry.missing_month);
          });

          this.defaulterList = [];
          defaulterGroups.forEach((months, userId) => {
            const user = userMap.get(userId);
            if (!user) return;

            const parsedDates = months
              .map(m => new Date(m))
              .sort((a, b) => a.getTime() - b.getTime());

            const fromMonth = parsedDates[0];
            const toMonth = parsedDates[parsedDates.length - 1];
            const period = `${fromMonth.toLocaleString('default', { month: 'short' })} - ${toMonth.toLocaleString('default', { month: 'short' })} ${toMonth.getFullYear()}`;

            const monthlyAmount = Number(user.maintenence_per_month) || 1500;

            this.defaulterList.push({
              userId: user.user_id,
              name: user.name,
              flatNumber: user.flat_number,
              userType: user.user_type,          // e.g. 'Admin' or 'User'
              currentResident: user.current_resident,
              contactNumber: user.contact_number1,
              outstandingAmount: parsedDates.length * monthlyAmount,
              periodOfDefault: period,
              lastPaymentDate: parsedDates[0]
            });
          });

          // Calculate dashboard stats
          this.totalResidents = this.allResidentsData.length;
          this.totalOwners = this.allResidentsData.filter(r => r.current_resident === 'Owner').length;
          this.totalTenants = this.allResidentsData.filter(r => r.current_resident === 'Tenant').length;
          this.totalOutstandingDues = this.defaulterList.reduce((sum, r) => sum + r.outstandingAmount, 0);
          this.numberOfDefaulters = this.defaulterList.length;

          this.filterDefaulters();
        } else {
          console.warn('One or both APIs returned invalid data format');
          this.resetDashboard();
        }
      },
      error: err => {
        console.error('Error fetching dashboard data', err);
        this.resetDashboard();
      }
    });
  }

  private resetDashboard(): void {
    this.allResidentsData = [];
    this.defaulterList = [];
    this.filteredDefaulters = [];
    this.totalResidents = 0;
    this.totalOwners = 0;
    this.totalTenants = 0;
    this.totalOutstandingDues = 0;
    this.numberOfDefaulters = 0;
  }

  filterDefaulters(): void {
    let filtered = [...this.defaulterList];
    const term = this.searchTerm.toLowerCase();

    if (term) {
      filtered = filtered.filter(d =>
        d.flatNumber.toLowerCase().includes(term) ||
        d.name.toLowerCase().includes(term)
      );
    }

    if (this.filterUserType) {
      filtered = filtered.filter(d => d.userType === this.filterUserType);
    }

    this.filteredDefaulters = filtered;
  }


  viewDefaulterDetails(userId: string): void {
    this.router.navigate(['/menu/profile-management'], {
      queryParams: { mode: 'view', userId }
    });
  }

  sendReminder(defaulter: ResidentProfileForDashboard): void {
    alert(`Sending reminder to ${defaulter.name} (${defaulter.flatNumber}) for ₹${defaulter.outstandingAmount}`);
    // Add API integration if required
  }

  makeCall(contactNumber: string | undefined): void {
    if (contactNumber) {
      window.location.href = `tel:${contactNumber}`;
    } else {
      alert('Contact number not available.');
    }
  }

  scrollToDefaulters(): void {
    const el = document.getElementById('defaulters-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
