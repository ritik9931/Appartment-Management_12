import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment'; // Assuming this path is correct based on your feedback

interface ApartmentCommitteeMember {
  id: number;
  name: string;
  designation: string;
  contactNumber: string;
  is_active: 'YES' | 'NO';
  from_date: string;
  to_date: string;
}

interface ApiResponse {
  message: string;
  status: number;
  Data: any[];
}

interface UserProfile {
  name: string;
  contact_number1: string;
  user_type: 'Owner' | 'Tenant' | 'Admin';
}


@Component({
  selector: 'app-apartment-committee-member',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './apartment-committee-member.component.html',
  styleUrls: ['./apartment-committee-member.component.css']
})
export class ApartmentCommitteeMemberComponent implements OnInit {
  committeeForm!: FormGroup;
  isAddingNew = false;
  currentEditId: number | null = null; // Used for editing (update) functionality

  committeeMemberList: ApartmentCommitteeMember[] = [];
  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 5;
  pagedCommitteeMemberList: ApartmentCommitteeMember[] = [];
  totalFilteredMembers: number = 0;

  message: string | null = null;
  messageType: 'success' | 'error' | null = null;

  isAdmin: boolean = false;
  isBrowser: boolean;

  userOptions: UserProfile[] = [];

  // Define the base API URL using the environment variable https://www.nomad.org.in
  private readonly BASE_API_URL = environment.apiUrl;

  // Define specific endpoints relative to the BASE_API_URL
  private readonly API_GET_ALL_COMMITTEE_MEMBERS = '/GetAllCommaiteeMembers';
  private readonly API_INSERT_COMMITTEE_MEMBER = '/InsertCommaiteeMembers';
  private readonly API_UPDATE_COMMITTEE_MEMBER = '/UpdateCommaiteeMembers'; // Assuming you have an update endpoint
  private readonly API_DELETE_COMMITTEE_MEMBER = '/DeleteCommaiteeMember';
  private readonly API_GET_ALL_USER_PROFILE = '/GetAllUserProfile';


  private platformId = inject(PLATFORM_ID); // Angular v14+ inject() is preferred for PLATFORM_ID

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private datePipe: DatePipe
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.committeeForm = this.fb.group({
      name: ['', Validators.required],
      designation: ['', Validators.required],
      contactNumber: ['', Validators.required],
      from_date: ['', Validators.required],
      to_date: ['', Validators.required],
      is_active: ['true'] // Default to 'true' for new members
    });
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      const role = localStorage.getItem('userRole');
      this.isAdmin = role === 'admin';
    }
    this.fetchUserProfiles();
    this.fecthApartmentCommitteeMember();
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

  fecthApartmentCommitteeMember(): void {
    // --- UPDATED API CALL ---
    this.http.get<ApiResponse>(`${this.BASE_API_URL}${this.API_GET_ALL_COMMITTEE_MEMBERS}`).subscribe({
      next: (response) => {
        if (response.status === 200 && response.Data) {
          this.committeeMemberList = response.Data
            .filter((item: any) => item.is_active === 'YES')
            .map((item: any) => ({
              id: item.id,
              name: item.name || '',
              designation: item.designation || '',
              contactNumber: item.contact_number || '',
              from_date: this.datePipe.transform(item.from_date, 'yyyy-MM-dd') || '',
              to_date: this.datePipe.transform(item.to_date, 'yyyy-MM-dd') || '',
              is_active: item.is_active // Retain 'YES' | 'NO' from backend
            }));
          this.updatePagedList();
        } else {
          this.committeeMemberList = [];
          this.updatePagedList();
          this.showMessage('Failed to fetch committee members: Invalid response format.', 'error');
        }
      },
      error: (error) => {
        console.error('Fetch error:', error);
        this.committeeMemberList = [];
        this.updatePagedList();
        this.showMessage('Error fetching data. Please try again.', 'error');
      }
    });
  }

  onAddCommitteeMember(): void {
    if (!this.isAdmin) return;
    this.isAddingNew = true;
    this.currentEditId = null; // Ensure ID is null for new additions
    this.committeeForm.reset({ is_active: 'true' }); // Reset with default active state
    this.clearMessage();
  }

  onSaveCommitteeMember(): void {
    this.clearMessage();

    if (this.committeeForm.invalid) {
      this.committeeForm.markAllAsTouched();
      this.showMessage('Please fill in all required fields.', 'error');
      return;
    }

    const formValue = this.committeeForm.value;
    const payload = {
      name: formValue.name,
      designation: formValue.designation,
      contact_number: formValue.contactNumber,
      from_date: formValue.from_date,
      to_date: formValue.to_date,
      is_active: formValue.is_active === 'true' // Convert 'true'/'false' string to boolean
    };

    // Note: HttpClient automatically sets 'Content-Type': 'application/json' for objects.
    // JSON.stringify is usually not needed unless you're sending a pre-stringified JSON.
    // const headers = new HttpHeaders({ 'Content-Type': 'application/json' }); // No longer needed explicitly here

    if (this.currentEditId !== null) {
      // --- ENABLED UPDATE FUNCTIONALITY ---
      const updatePayload = { id: this.currentEditId, ...payload };
      this.http.post<ApiResponse>(`${this.BASE_API_URL}${this.API_UPDATE_COMMITTEE_MEMBER}`, updatePayload).subscribe({
        next: (response) => {
          if (response?.status === 200 || response?.status === 201) {
            this.showMessage('Committee Member updated successfully!', 'success');
            this.fecthApartmentCommitteeMember();
            this.resetFormState();
          } else {
            this.showMessage('Failed to update. Server response invalid.', 'error');
            console.warn('Update API response:', response); // Log server response for debugging
          }
        },
        error: (error) => {
          console.error('Update API error:', error);
          this.showMessage('Error updating data. Please try again.', 'error');
        }
      });
    } else {
      // --- UPDATED SAVE API CALL ---
      this.http.post<ApiResponse>(`${this.BASE_API_URL}${this.API_INSERT_COMMITTEE_MEMBER}`, payload).subscribe({
        next: (response) => {
          if (response?.status === 200 || response?.status === 201) {
            this.showMessage('Committee Member saved successfully!', 'success');
            this.fecthApartmentCommitteeMember();
            this.resetFormState();
          } else {
            this.showMessage('Failed to save. Server response invalid.', 'error');
            console.warn('Save API response:', response); // Log server response for debugging
          }
        },
        error: (error) => {
          console.error('Save API error:', error);
          this.showMessage('Error saving data. Please try again.', 'error');
        }
      });
    }
  }

  editCommitteeMember(member: ApartmentCommitteeMember): void {
    if (!this.isAdmin) return;
    this.clearMessage();
    this.isAddingNew = true; // Show the form for editing
    this.currentEditId = member.id;

    this.committeeForm.patchValue({
      name: member.name,
      designation: member.designation,
      contactNumber: member.contactNumber,
      from_date: this.datePipe.transform(member.from_date, 'yyyy-MM-dd'),
      to_date: this.datePipe.transform(member.to_date, 'yyyy-MM-dd'),
      is_active: member.is_active === 'YES' ? 'true' : 'false' // Convert 'YES'/'NO' to 'true'/'false' string for form
    });
  }

  fetchUserProfiles(): void {
    // --- UPDATED API CALL ---
    this.http.get<any>(`${this.BASE_API_URL}${this.API_GET_ALL_USER_PROFILE}`).subscribe({
      next: (res) => {
        const owners = res?.Data?.owner || [];
        const tenants = res?.Data?.tenent || [];

        this.userOptions = [
          ...owners.map((o: any) => ({
            name: o.name,
            contact_number1: o.contact_number1,
            user_type: 'Owner'
          })),
          ...tenants
            .filter((t: any) => t.is_active === 'YES') // Only active tenants
            .map((t: any) => ({
              name: t.tanent_name, // Assuming 'tanent_name' for tenant name
              contact_number1: t.contact_number1,
              user_type: 'Tenant'
            }))
        ];
      },
      error: (error) => {
        console.error('Fetch user profiles error:', error);
        this.showMessage('Failed to load user profiles.', 'error');
      }
    });
  }

  onUserSelect(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const selectedName = selectElement.value;

    const user = this.userOptions.find(u => u.name === selectedName);
    if (user) {
      this.committeeForm.patchValue({
        contactNumber: user.contact_number1
      });
    }
  }


  confirmDelete(id: number | undefined): void {
    this.clearMessage();
    if (!this.isAdmin) return;

    if (id == null) {
      this.showMessage('Invalid ID. Cannot delete.', 'error');
      return;
    }

    if (confirm('Are you sure you want to delete this member?')) {
      this.deleteCommitteeMember(id);
    }
  }

  deleteCommitteeMember(id: number): void {
    // --- UPDATED API CALL ---
    const url = `${this.BASE_API_URL}${this.API_DELETE_COMMITTEE_MEMBER}?com_id=${id}`;
    this.http.get<ApiResponse>(url).subscribe({
      next: (response) => {
        if (response.status === 200) {
          this.showMessage('Member deleted successfully!', 'success');
          this.fecthApartmentCommitteeMember();
          this.resetFormState();
        } else {
          this.showMessage('Failed to delete member. Server response invalid.', 'error');
          console.warn('Delete API response:', response); // Log server response for debugging
        }
      },
      error: (error) => {
        console.error('Delete API error:', error);
        this.showMessage('Error deleting member. Please try again.', 'error');
      }
    });
  }

  resetFormState(): void {
    this.committeeForm.reset({ is_active: 'true' });
    this.isAddingNew = false;
    this.currentEditId = null;
    this.clearMessage();
  }

  get filteredCommitteeMembers(): ApartmentCommitteeMember[] {
    const lower = this.searchTerm.toLowerCase();
    return this.committeeMemberList.filter(member =>
      member.name.toLowerCase().includes(lower) ||
      member.designation.toLowerCase().includes(lower) ||
      member.contactNumber.toLowerCase().includes(lower)
    );
  }

  get totalPages(): number {
    return Math.ceil(this.totalFilteredMembers / this.itemsPerPage);
  }

  updatePagedList(): void {
    const filtered = this.filteredCommitteeMembers;
    this.totalFilteredMembers = filtered.length;
    this.currentPage = Math.max(1, Math.min(this.currentPage, this.totalPages || 1));
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.pagedCommitteeMemberList = filtered.slice(start, start + this.itemsPerPage);
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

  exportToExcel(): void {
    this.clearMessage();
    if (this.filteredCommitteeMembers.length === 0) {
      this.showMessage('No data to export.', 'error');
      return;
    }

    const headers = ['Name', 'Designation', 'Contact Number', 'From Date', 'To Date', 'Is Active'];
    const data = this.filteredCommitteeMembers.map(m => [
      m.name, m.designation, m.contactNumber,
      this.datePipe.transform(m.from_date, 'yyyy-MM-dd') || '',
      this.datePipe.transform(m.to_date, 'yyyy-MM-dd') || '',
      m.is_active === 'YES' ? 'Active' : 'Inactive'
    ]);

    const csvContent = [headers, ...data]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'CommitteeMembers.csv');
    link.click();
    this.showMessage('Data exported to Excel (CSV) successfully!', 'success');
  }
}