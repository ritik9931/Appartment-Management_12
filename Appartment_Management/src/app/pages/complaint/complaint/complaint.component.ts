import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-complaint',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, FormsModule],
  templateUrl: './complaint.component.html',
  styleUrls: ['./complaint.component.css']
})
export class ComplaintComponent implements OnInit {
  complaintForm!: FormGroup;
  complaintTypes: string[] = [
    'Water leakage', 'Electricity', 'Cleaning', 'Security', 'Lift issue', 'Parking', 'Others'
  ];
  imagePreview: string | null = null;
  today = new Date().toISOString().split('T')[0];
  showForm = false;
  isAdmin = false;
  searchText = '';
  filterStatus = '';
  page = 1;
  pageSize = 5;
  complaints: any[] = [];
  showToast = false;
  toastMessage = '';
  selectedComplaint: any = null;
  complaintModalInstance: any = null;
  isBrowser: boolean;
  userId: string = '';
  loading = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      const role = localStorage.getItem('userRole');
      this.isAdmin = role === 'admin';
      this.userId = localStorage.getItem('userId') || '';
    }

    this.complaintForm = this.fb.group({
      type: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(10)]],
      photo: [null],
      photo_name: ['']
    });

    this.getComplaints();
  }

  getComplaints(): void {
    if (!this.userId) return;
    this.loading = true;

    this.http.get<any>(`/rktapi/api/rkt/GetComplaints?user_id=${this.userId}`).subscribe({
      next: (res) => {
        this.complaints = res?.Data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to fetch complaints', err);
        this.loading = false;
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('File size should not exceed 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const fullBase64 = reader.result as string;
        const base64Only = fullBase64.includes(',') ? fullBase64.split(',')[1] : fullBase64;
        this.imagePreview = fullBase64;

        this.complaintForm.patchValue({
          photo: base64Only,      // field for pure base64
          photo_name: file.name   // field for filename
        });
        console.log('File selected:', file.name);
        console.log('Patched photo_name:', this.complaintForm.get('photo_name')?.value);
      };

      reader.readAsDataURL(file);
    }
  }



  toggleForm(): void {
    if (this.showForm) {
      this.complaintForm.reset();
      this.imagePreview = null;
    }
    this.showForm = !this.showForm;
  }

  submitComplaint(): void {
    if (this.complaintForm.invalid) {
      this.complaintForm.markAllAsTouched();
      return;
    }

    const formValue = this.complaintForm.value;

    const payload = {
      user_id: this.userId,
      comp_type: formValue.type,
      desc: formValue.description,
      proof_image: formValue.photo || '',
      proof_image_name: formValue.photo_name || '',  // <-- use photo_name here
      comp_status: 'Open'
    };
    console.log('Payload to send:', payload);



    this.http.post('/rktapi/api/rkt/InsertComplaint', payload).subscribe({
      next: () => {
        this.showSuccessToast('Complaint submitted successfully!');
        this.complaintForm.reset();
        this.imagePreview = null;
        this.toggleForm();
        this.getComplaints();
      },
      error: (err) => {
        console.error('Submit failed', err);
        this.showSuccessToast('Submission failed!');
      }
    });
  }

  filteredComplaints(returnAll: boolean = false): any[] {
    const search = this.searchText.toLowerCase();

    let filtered = this.complaints
      .filter(c =>
        (!this.searchText || c.comp_type?.toLowerCase().includes(search) || c.user_id?.includes(this.searchText)) &&
        (!this.filterStatus || c.comp_status === this.filterStatus)
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (returnAll) return filtered;

    const start = (this.page - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  }

  deleteComplaint(complaint: any): void {
    const confirmDelete = confirm('Are you sure you want to delete this complaint?');
    if (confirmDelete) {
      const deleteUrl = `/rktapi/api/rkt/DeleteComplaint?id=${complaint.id}`;
      console.log('Calling delete via GET:', deleteUrl); // Optional debug log

      this.http.get(deleteUrl).subscribe({
        next: () => {
          this.showSuccessToast('Complaint deleted successfully.');
          this.getComplaints(); // 🔄 Refresh the complaint list from backend
        },
        error: err => {
          console.error('Delete failed', err);
          this.showSuccessToast('Failed to delete complaint.');
        }
      });
    }
  }

  downloadProofImage(id: number, fallbackName: string = 'proof_image.png'): void {
    const url = `/rktapi/api/rkt/GetComplaintImage?id=${id}`;

    this.http.get<any>(url).subscribe({
      next: (res) => {
        console.log('API Response:', res);

        const base64String = res?.Data?.[0]?.proof_image;
        const fileName = res?.Data?.[0]?.proof_image_name || fallbackName;

        console.log('Base64 String:', base64String);
        console.log('File Name:', fileName);

        if (!base64String) {
          this.showSuccessToast('No image available.');
          return;
        }

        // Detect MIME type from extension
        const extension = fileName.split('.').pop()?.toLowerCase() || '';
        let mimeType = 'application/octet-stream';
        switch (extension) {
          case 'jpg':
          case 'jpeg':
            mimeType = 'image/jpeg';
            break;
          case 'png':
            mimeType = 'image/png';
            break;
          case 'webp':
            mimeType = 'image/webp';
            break;
        }

        try {
          const byteCharacters = atob(base64String);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: mimeType });

          const a = document.createElement('a');
          const blobUrl = URL.createObjectURL(blob);
          a.href = blobUrl;
          a.download = fileName;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);

          console.log('Download triggered');
        } catch (error) {
          console.error('Error processing base64 image', error);
          this.showSuccessToast('Invalid image format.');
        }
      },
      error: (err) => {
        console.error('Download failed', err);
        this.showSuccessToast('Failed to download image.');
      }
    });
  }

  showSuccessToast(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => this.showToast = false, 3000);
  }

  async openComplaintModal(complaint: any): Promise<void> {
    this.selectedComplaint = complaint;
    if (this.isBrowser) {
      const modalElement = document.getElementById('complaintModal');
      if (modalElement) {
        const { Modal } = await import('bootstrap');
        if (!this.complaintModalInstance) {
          this.complaintModalInstance = new Modal(modalElement);
        }
        this.complaintModalInstance.show();
      }
    }
  }
}
