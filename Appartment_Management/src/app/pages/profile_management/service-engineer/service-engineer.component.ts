import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment'; // Corrected import path based on your feedback
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

interface ServiceEngineer {
  id: number;
  name: string;
  vendorType: string;
  contactNumber: string;
  isActive: string;
  remarks: string;
}

@Component({
  selector: 'app-service-engineer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, FormsModule], // Removed trailing comma
  templateUrl: './service-engineer.component.html',
  styleUrls: ['./service-engineer.component.css']
})
export class ServiceEngineerComponent implements OnInit {
  serviceEngineerForm!: FormGroup;
  isAddingNew = false;
  isEditing = false;
  currentEditId: number | null = null;
  serviceEngineerList: ServiceEngineer[] = [];

  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 5;
  pagedServiceEngineerList: ServiceEngineer[] = [];
  totalFilteredEngineers: number = 0;
  message: string | null = null;
  messageType: 'success' | 'error' | null = null;

  isAdmin: boolean = false;
  isBrowser: boolean = false;

  // Use the environment variable for the base URL
  private readonly BASE_API_URL = environment.apiUrl;

  // Define the specific endpoint paths relative to the base URL
  // These should NOT include 'rktapi/api/rkt' as BASE_API_URL already contains it.
  // Assuming your backend endpoints are like:
  // http://67.211.213.61/rktapi/api/rkt/GetAllVendors
  // http://67.211.213.61/rktapi/api/rkt/InsertVendorProfile
  // etc.
  private readonly API_GET_ALL_VENDORS = '/GetAllVendors';
  private readonly API_INSERT_VENDOR = '/InsertVendorProfile';
  private readonly API_UPDATE_VENDOR = '/UpdateVendorProfile';
  private readonly API_DELETE_VENDOR = '/DeleteVendorProfile';


  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      const role = localStorage.getItem('userRole');
      this.isAdmin = role === 'admin';
    }

    this.serviceEngineerForm = this.fb.group({
      name: ['', Validators.required],
      vendorType: ['', Validators.required],
      contactNumber: ['', Validators.required],
      isActive: ['', Validators.required],
      remarks: ['']
    });
  }

  ngOnInit(): void {
    this.fetchServiceEngineers();
  }

  showMessage(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.clearMessage(), 5000);
  }

  clearMessage(): void {
    this.message = null;
    this.messageType = null;
  }

  fetchServiceEngineers(): void {
    // Corrected: Use BASE_API_URL + specific endpoint
    this.http.get<any>(`${this.BASE_API_URL}${this.API_GET_ALL_VENDORS}`).subscribe({
      next: (response) => {
        if (response?.status === 200 &&
            response?.message?.toLowerCase() === 'success' &&
            Array.isArray(response.Data)) {
          this.serviceEngineerList = response.Data.map((item: any) => ({
            id: item.id,
            name: item.name || '',
            vendorType: item.vendor_type || '',
            contactNumber: item.contact_number || '',
            isActive: item.is_active || '',
            remarks: item.remarks || ''
          }));
        } else {
          this.serviceEngineerList = [];
          this.showMessage('Failed to fetch service engineers: Invalid response format.', 'error');
        }
        this.updatePagedList();
      },
      error: (error) => {
        console.error('Fetch error:', error);
        this.serviceEngineerList = [];
        this.updatePagedList();
        this.showMessage('Error fetching data. Please try again.', 'error');
      }
    });
  }

  onAddServiceEngineer(): void {
    this.isAddingNew = true;
    this.isEditing = false;
    this.currentEditId = null;
    this.serviceEngineerForm.reset();
    this.clearMessage();
  }

  onSaveServiceEngineer(): void {
    this.clearMessage();
    if (this.serviceEngineerForm.invalid) {
      this.serviceEngineerForm.markAllAsTouched();
      this.showMessage('Please fill in all required fields.', 'error');
      return;
    }

    const formValue = this.serviceEngineerForm.value;
    const payload = {
      name: formValue.name,
      vendor_type: formValue.vendorType,
      contact_number: formValue.contactNumber,
      is_active: formValue.isActive,
      remarks: formValue.remarks
    };

    if (this.isEditing && this.currentEditId !== null) {
      const updatePayload = { id: this.currentEditId, ...payload };
      // Corrected: Use BASE_API_URL + specific endpoint
      this.http.post<any>(`${this.BASE_API_URL}${this.API_UPDATE_VENDOR}`, updatePayload).subscribe({
        next: (response) => {
          if (response?.status === 200 && response?.message?.toLowerCase() === 'success') {
            this.showMessage('Service Engineer updated successfully!', 'success');
            this.fetchServiceEngineers();
            this.resetFormState();
          } else {
            this.showMessage('Failed to update. Server response invalid.', 'error');
            console.warn('Update API response:', response);
          }
        },
        error: (error) => {
          this.showMessage('Error updating data. Please try again.', 'error');
          console.error('Update API error:', error);
        }
      });

    } else {
      // Corrected: Use BASE_API_URL + specific endpoint
      this.http.post<any>(`${this.BASE_API_URL}${this.API_INSERT_VENDOR}`, payload).subscribe({
        next: (response) => {
          if (response?.status === 200 && response?.message?.toLowerCase() === 'success') {
            this.showMessage('Service Engineer saved successfully!', 'success');
            this.fetchServiceEngineers();
            this.resetFormState();
          } else {
            this.showMessage('Failed to save. Server response invalid.', 'error');
            console.warn('Save API response:', response);
          }
        },
        error: (error) => {
          this.showMessage('Error saving data. Please try again.', 'error');
          console.error('Save API error:', error);
        }
      });
    }
  }

  editServiceEngineer(engineer: ServiceEngineer): void {
    this.clearMessage();
    this.isAddingNew = true;
    this.isEditing = true;
    this.currentEditId = engineer.id;
    this.serviceEngineerForm.patchValue(engineer);
  }

  confirmDelete(id: number | undefined): void {
    this.clearMessage();
    if (!id) {
      this.showMessage('Invalid ID. Cannot delete.', 'error');
      return;
    }
    if (confirm('Are you sure you want to delete this service engineer?')) {
      this.deleteServiceEngineer(id);
    }
  }

  deleteServiceEngineer(id: number): void {
    // Corrected: Use BASE_API_URL + specific endpoint + query param
    const deleteUrl = `${this.BASE_API_URL}${this.API_DELETE_VENDOR}?id=${encodeURIComponent(id)}`;
    this.http.get<any>(deleteUrl).subscribe({
      next: (response) => {
        if (response?.status === 200 && response?.message?.toLowerCase() === 'success') {
          this.showMessage('Service Engineer deleted successfully!', 'success');
          this.serviceEngineerList = this.serviceEngineerList.filter(e => e.id !== id);
          this.updatePagedList();
          if (this.pagedServiceEngineerList.length === 0 && this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
          }
          this.resetFormState();
        } else {
          this.showMessage('Failed to delete. Server response invalid.', 'error');
          console.warn('Delete API response:', response);
        }
      },
      error: (error) => {
        this.showMessage('Error deleting service engineer. Please try again.', 'error');
        console.error('Delete API error:', error);
      }
    });
  }

  resetFormState(): void {
    this.serviceEngineerForm.reset();
    this.isAddingNew = false;
    this.isEditing = false;
    this.currentEditId = null;
    this.clearMessage();
  }

  get filteredServiceEngineers(): ServiceEngineer[] {
    const search = this.searchTerm.toLowerCase().trim();
    if (!search) return this.serviceEngineerList;
    return this.serviceEngineerList.filter(e =>
      e.name.toLowerCase().includes(search) ||
      e.vendorType.toLowerCase().includes(search) ||
      e.contactNumber.toLowerCase().includes(search) ||
      e.remarks.toLowerCase().includes(search)
    );
  }

  get totalPages(): number {
    return Math.ceil(this.totalFilteredEngineers / this.itemsPerPage);
  }

  updatePagedList(): void {
    const filtered = this.filteredServiceEngineers;
    this.totalFilteredEngineers = filtered.length;

    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    } else if (this.totalPages === 0 && this.totalFilteredEngineers === 0) {
      this.currentPage = 1;
    } else if (this.currentPage < 1 && this.totalPages > 0) {
      this.currentPage = 1;
    }

    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.pagedServiceEngineerList = filtered.slice(startIndex, endIndex);
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.updatePagedList();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagedList();
    }
  }

  onItemsPerPageChange(): void {
    this.itemsPerPage = Number(this.itemsPerPage);
    this.currentPage = 1;
    this.updatePagedList();
  }
}