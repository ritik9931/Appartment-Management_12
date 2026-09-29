import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-complaint-status',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './complaint-status.component.html',
  styleUrls: ['./complaint-status.component.css']
})
export class ComplaintStatusComponent implements OnInit {
  complaints: any[] = [];
  filtered: any[] = [];
  page = 1;
  pageSize = 5;
  searchText = '';
  isAdmin = false;
  isBrowser: boolean;
  editRow: number | null = null;
  userId: string = '';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      const role = localStorage.getItem('userRole');
      this.isAdmin = role === 'admin';
      this.userId = localStorage.getItem('userId') || '';
    }

    this.fetchComplaints();
  }

  fetchComplaints(): void {
    if (!this.isAdmin && !this.userId) return;

    const url = this.isAdmin
      ? `/rkt/api/rkt/GetComplaints`
      : `/rkt/api/rkt/GetComplaints?user_id=${this.userId}`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        this.complaints = res?.Data || [];
        this.filtered = [...this.complaints];
      },
      error: (err) => console.error('Error loading complaints', err)
    });
  }

  applyFilter(): void {
    const term = this.searchText.toLowerCase();
    this.filtered = this.complaints.filter(c =>
      c.user_id?.toLowerCase().includes(term) ||
      c.comp_type?.toLowerCase().includes(term) ||
      c.comp_status?.toLowerCase().includes(term)
    );
  }

  pagedComplaints() {
    return this.filtered.slice((this.page - 1) * this.pageSize, this.page * this.pageSize);
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

  startEdit(id: number) {
    this.editRow = id;
  }

  saveEdit(complaint: any) {
    let url = `/rkt/api/rkt/UpdateComplaint?id=${complaint.id}&comp_status=${complaint.comp_status}`;

    if (complaint.comp_status === 'Closed' || complaint.comp_status === 'Resolved') {
      // Use today's date for close_on
      const formattedDate = new Date().toISOString().split('T')[0];
      complaint.close_on = formattedDate;
      url += `&close_on=${formattedDate}`;
    } else if (complaint.comp_status === 'Open' || complaint.comp_status === 'In Progress') {
      // Use created_at date (submitted date) for close_on
      if (complaint.created_at) {
        const submittedDate = complaint.created_at.split('T')[0]; // get YYYY-MM-DD only
        complaint.close_on = submittedDate;
        url += `&close_on=${submittedDate}`;
      } else {
        // fallback: no close_on if created_at missing
        complaint.close_on = null;
      }
    } else {
      complaint.close_on = null;
    }

    console.log('✅ Final URL to call:', url);

    this.http.put(url, null).subscribe({
      next: () => {
        this.editRow = null;
        alert(`Complaint for ${complaint.user_id} updated to '${complaint.comp_status}'`);
      },
      error: (err) => {
        console.error('❌ Status update failed', err);
        alert('Failed to update complaint status.');
      }
    });
  }




  filteredComplaints(returnAll = false) {
    return returnAll ? this.filtered : this.pagedComplaints();
  }

  isValidDate(dateStr: string): boolean {
    if (!dateStr) return false;
    return !dateStr.startsWith('0001');
  }

}
