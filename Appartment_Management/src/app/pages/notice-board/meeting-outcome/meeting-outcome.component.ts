import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PLATFORM_ID } from '@angular/core';

@Component({
  selector: 'app-meeting-outcome',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, HttpClientModule],
  templateUrl: './meeting-outcome.component.html',
  styleUrl: './meeting-outcome.component.css'
})
export class MeetingOutcomeComponent implements OnInit {
  platformId = inject(PLATFORM_ID);
  outcomeForm!: FormGroup;
  meetingOutcomes = signal<any[]>([]);
  isAdmin = false;
  showForm = signal(true);

  // Pagination & Search
  currentPage = signal(1);
  itemsPerPage = 5;
  searchTerm = signal('');

  constructor(private fb: FormBuilder, private http: HttpClient) { }
meetings = signal<any[]>([]);
  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const role = localStorage.getItem('userRole');
      this.isAdmin = role === 'admin';
    }

    this.createForm();
    this.fetchMeetingOutcomes();
    this.fetchMeetings();
  }

  fetchMeetings(): void {
  this.http.get<any>('/rktapi/api/rkt/GetAllMeetings').subscribe({
    next: (res) => {
      const list = Array.isArray(res) ? res : res.Data || [];
      this.meetings.set(list);
    },
    error: (err) => console.error('Failed to fetch meetings', err)
  });
}

  showOutcomeForm: boolean = false;

  toggleForm() {
    this.showOutcomeForm = !this.showOutcomeForm;
  }

  createForm(): void {
    this.outcomeForm = this.fb.group({
      meeting_id: ['', Validators.required],
      agenda_item: ['', Validators.required],
      decision_taken: [''],
      action_required: [''],
      responsible_person: [''],
      deadline: [''],
      remarks: [''],
      outcome_file: [''],
      outcome_file_name: ['']
    });
  }

 onSubmit(): void {
  if (this.outcomeForm.valid) {
    this.http.post('/rktapi/api/rkt/InsertMeetingOutcome', this.outcomeForm.value).subscribe({
      next: () => {
        this.fetchMeetingOutcomes();
        this.outcomeForm.reset();
        this.showOutcomeForm = false;
        this.showSuccessToast('Meeting outcome saved successfully!');
      },
      error: err => console.error('Insert failed', err)
    });
  }
}


  fetchMeetingOutcomes(): void {
    this.http.get<any>('/rktapi/api/rkt/GetAllMeetingOutcome').subscribe({
      next: res => {
        // Expect res.data to be an array; fallback to empty array if missing
        const list = Array.isArray(res) ? res : res.Data || [];
        this.meetingOutcomes.set(list);
        this.currentPage.set(1); // reset to first page on new data load
      },
      error: err => console.error('Fetch failed', err)
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        this.outcomeForm.patchValue({
          outcome_file: base64String,
          outcome_file_name: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  }


  onDelete(id: string): void {
    if (confirm('Are you sure you want to delete this entry?')) {
      this.http.get(`/rktapi/api/rkt/DeleteMeetingOutcome?id=${id}`).subscribe({
        next: () => {
          // Refresh list after deletion
          this.fetchMeetingOutcomes();
        },
        error: err => {
          console.error('Delete failed', err);
          alert('Failed to delete the meeting outcome.');
        }
      });
    }
  }


  downloadOutcomeFile(id: number, fileName: string) {
    this.http.get<any>(`/rktapi/api/rkt/GetMeetingOutcomeFile?id=${id}`).subscribe({
      next: (res) => {
        console.log('File API response:', res);

        const fileData = res?.Data?.[0]; // ✅ <-- Correct structure
        const base64 = fileData?.outcome_file;
        const name = fileData?.outcome_file_name || fileName || 'outcome_file';

        if (!base64) {
          alert('File data is missing.');
          return;
        }

        const binary = atob(base64);
        const byteNumbers = new Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          byteNumbers[i] = binary.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray]);
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = name;
        link.click();
      },
      error: (err) => {
        console.error('File download error', err);
        alert('Failed to download file.');
      }
    });
  }


  // Helper to infer mime type
  getMimeTypeFromFilename(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'doc': return 'application/msword';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xls': return 'application/vnd.ms-excel';
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'txt': return 'text/plain';
      default: return 'application/octet-stream';
    }
  }

  autoGrowTextArea(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto'; // reset height to calculate scrollHeight correctly
    textarea.style.height = textarea.scrollHeight + 'px'; // set height based on content
  }



  get filteredItems() {
    const items = this.meetingOutcomes();
    return Array.isArray(items)
      ? items.filter(item =>
        Object.values(item)
          .join(' ')
          .toLowerCase()
          .includes(this.searchTerm().toLowerCase())
      )
      : [];
  }

  get paginatedItems() {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.filteredItems.slice(start, start + this.itemsPerPage);
  }

  get totalPages() {
    return Math.ceil(this.filteredItems.length / this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage.set(page);
    }
  }

  showToast = false;
toastMessage = '';

showSuccessToast(message: string) {
  this.toastMessage = message;
  this.showToast = true;

  setTimeout(() => {
    this.showToast = false;
  }, 3000); // Hide after 3 seconds
}

hideToast() {
  this.showToast = false;
}

}
