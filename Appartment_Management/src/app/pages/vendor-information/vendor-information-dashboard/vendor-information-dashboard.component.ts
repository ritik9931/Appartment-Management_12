import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface Vendor {
  id: number;
  name: string;
  vendorType: string;
  contactNumber: string;
  isActive: string;
  remarks?: string;
}

@Component({
  selector: 'app-vendor-information-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './vendor-information-dashboard.component.html',
  styleUrls: ['./vendor-information-dashboard.component.css']
})
export class VendorInformationDashboardComponent implements OnInit {

  private http = inject(HttpClient);

  vendorList: Vendor[] = [];

  dashboardStats = {
    total: 0,
    active: 0,
    inactive: 0,
    types: new Map<string, number>()
  };

  readonly API_URL = '/rktapi/api/rkt/GetAllVendors';

  ngOnInit(): void {
    this.loadVendors();
  }

  loadVendors(): void {
    this.http.get<any>(this.API_URL).subscribe({
      next: (response) => {
        if (response?.status === 200 && response.message?.toLowerCase() === 'success') {
          this.vendorList = response.Data.map((item: any) => ({
            id: item.id,
            name: item.name || '',
            vendorType: item.vendor_type || '',
            contactNumber: item.contact_number || '',
            isActive: (item.is_active || '').trim().toLowerCase(),
            remarks: item.remarks || ''
          }))
          // Sort so that 'yes' appears before 'no'
          .sort((a: Vendor, b: Vendor) => {
            return (a.isActive === 'yes' ? -1 : 1) - (b.isActive === 'yes' ? -1 : 1);
          });

          this.generateStats();
        } else {
          console.error('Invalid response format:', response);
          this.vendorList = [];
        }
      },
      error: (err) => {
        console.error('API error:', err);
        this.vendorList = [];
      }
    });
  }

  generateStats(): void {
    this.dashboardStats.total = this.vendorList.length;
    this.dashboardStats.active = this.vendorList.filter(v => v.isActive === 'yes').length;
    this.dashboardStats.inactive = this.vendorList.filter(v => v.isActive === 'no').length;

    const typeCount = new Map<string, number>();
    this.vendorList.forEach(v => {
      const count = typeCount.get(v.vendorType) || 0;
      typeCount.set(v.vendorType, count + 1);
    });

    this.dashboardStats.types = typeCount;
  }

  // Pagination Logic
  currentPage = 1;
  itemsPerPage = 10;

  get totalPages(): number {
    return Math.ceil(this.vendorList.length / this.itemsPerPage);
  }

  get paginatedVendors(): Vendor[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.vendorList.slice(start, start + this.itemsPerPage);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }
}
