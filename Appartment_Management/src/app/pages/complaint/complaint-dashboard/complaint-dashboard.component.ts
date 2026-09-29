import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

interface Complaint {
  id: number;
  user_id: string;
  comp_type: string;
  comp_status: string;
  created_at: string;
  close_on?: string;
  [key: string]: any; // fallback for extra properties
}

@Component({
  selector: 'app-complaint-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule, RouterModule],
  templateUrl: './complaint-dashboard.component.html',
  styleUrls: ['./complaint-dashboard.component.css']
})
export class ComplaintDashboardComponent implements OnInit {
  isBrowser: boolean;
  isAdmin = false;
  userId = '';
  latestComplaints: Complaint[] = [];
  complaintStats: { label: string; count: number }[] = [];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.isAdmin = localStorage.getItem('userRole') === 'admin';
      this.userId = localStorage.getItem('userId') || '';
      console.log('Dashboard init - isAdmin:', this.isAdmin, 'userId:', this.userId);
    }

    this.fetchLatestComplaints();

    this.complaintStats = [];
  }

  fetchLatestComplaints(): void {
    if (!this.userId) {
      this.latestComplaints = [];
      return;
    }

    const url = `/rkt/api/rkt/GetComplaints?user_id=${this.userId}`;
    console.log('Fetching complaints from URL:', url);

    this.http.get<{ Data: Complaint[] }>(url).subscribe({
      next: (res) => {
        const all = res?.Data || [];
        this.latestComplaints = all.slice(0, 5);
        console.log('Latest complaints loaded:', this.latestComplaints);
      },
      error: (err) => {
        console.error('Failed to fetch complaints:', err);
        this.latestComplaints = [];
      }
    });
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Open': return 'badge bg-warning text-dark';
      case 'In Progress': return 'badge bg-info text-dark';
      case 'Resolved': return 'badge bg-success';
      case 'Closed': return 'badge bg-secondary';
      default: return 'badge bg-light text-dark';
    }
  }
}
