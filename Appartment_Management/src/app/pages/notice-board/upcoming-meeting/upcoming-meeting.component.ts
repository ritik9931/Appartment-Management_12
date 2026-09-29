import { CommonModule, NgIf, NgForOf, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

interface Meeting {
  id: number;
  dateTime: string;
  title: string;
  location: string;
  desc: string;
  meetingUrl?: string;
  meetingFileName?: string;
  notifyResidents: boolean;
}

interface ApiMeeting {
  id: string;
  title: string;
  m_date: string;
  m_time: string;
  location: string;
  called_by: string;
  created_by: string;
  status: string;
  meting_file_name?: string;
  meting_file?: string;
  description?: string;
}

interface ApiResponseWrapper {
  message: string;
  status: number;
  Data: ApiMeeting[];
}

declare const bootstrap: any;

@Component({
  selector: 'app-upcoming-meeting',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIf, NgForOf, FormsModule],
  templateUrl: './upcoming-meeting.component.html',
  styleUrls: ['./upcoming-meeting.component.css']
})
export class UpcomingMeetingComponent implements OnInit {
  isAdmin = false;
  showForm = false;

  meetingForm!: FormGroup;
  events: Meeting[] = [];
  filteredEvents: Meeting[] = [];
  selectedEvent: Meeting | null = null;

  searchTerm = '';
  currentPage: number = 0;
  itemsPerPage: number = 5;

  private nextId = 1;
  private selectedMeetingFile: File | null = null;

  private insertMeetingApiUrl = 'https://www.nomad.org.in/rkt/api/rkt/InsertMeeting';
  private getAllMeetingsApiUrl = 'https://www.nomad.org.in/rkt/api/rkt/GetAllMeetings';
  private deleteMeetingApiUrl = 'https://www.nomad.org.in/rkt/api/rkt/DeleteMeeting';

  private isBrowser: boolean;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.meetingForm = this.fb.group({
      title: ['', Validators.required],
      dateTime: ['', Validators.required],
      location: ['', Validators.required],
      notifyResidents: [false],
      desc: ['', Validators.required],
      meetingFile: [null]
    });

    if (this.isBrowser) {
      const role = localStorage.getItem('userRole');
      this.isAdmin = role === 'admin';

      const modalEl = document.getElementById('viewEventModal');
      if (modalEl) {
        modalEl.addEventListener('hidden.bs.modal', () => {
          this.selectedEvent = null;
        });
      }
    }

    this.fetchAllMeetings();
  }

  private fetchAllMeetings(): void {
    this.http.get<ApiResponseWrapper>(this.getAllMeetingsApiUrl).pipe(
      map(response => {
        const apiMeetings = response.Data;
        if (!Array.isArray(apiMeetings)) throw new TypeError('Expected array from API');

        return apiMeetings
          .filter(apiMeet => apiMeet.status?.toLowerCase() !== 'cancelled')
          .map(apiMeet => {
            let combinedDateTime = new Date().toISOString();
            const datePart = apiMeet.m_date?.trim().slice(0, 10);
            const timeMatch = apiMeet.m_time?.trim().match(/^(\d{2}):(\d{2})(:\d{2})?$/);

            if (datePart && timeMatch) {
              combinedDateTime = `${datePart}T${timeMatch[0]}`;
            } else if (datePart) {
              combinedDateTime = `${datePart}T00:00:00`;
            }

            return {
              id: parseInt(apiMeet.id) || this.nextId++,
              dateTime: combinedDateTime,
              title: apiMeet.title,
              location: apiMeet.location,
              desc: apiMeet.description || 'No description provided.',
              meetingUrl: apiMeet.meting_file
                ? `data:application/octet-stream;base64,${apiMeet.meting_file}`
                : undefined,
              meetingFileName: apiMeet.meting_file_name || '',
              notifyResidents: false
            };
          });

      }),
      catchError(error => {
        const msg = error instanceof HttpErrorResponse
          ? `Error (${error.status}): ${error.message}`
          : `Unexpected error: ${error.message}`;
        this.showAlert(msg);
        this.events = [];
        this.filterMeetings();
        return EMPTY;
      })
    ).subscribe((meetings: Meeting[]) => {
      this.events = meetings;
      this.sortEvents();
      this.filterMeetings();
    });
  }

  onMeetingFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedMeetingFile = input.files?.[0] || null;
    this.meetingForm.patchValue({ meetingFile: this.selectedMeetingFile });
  }

  downloadMeetingFile(id: number, fileName: string): void {
    const downloadUrl = `https://www.nomad.org.in/rkt/api/rkt/GetMeetingFile?id=${id}`;

    this.http.get<any>(downloadUrl).subscribe({
      next: (response) => {
        const fileData = response?.Data?.[0];

        if (!fileData || !fileData.meting_file) {
          this.showAlert('❌ No file data received.');
          return;
        }

        const base64 = fileData.meting_file;
        const name = fileData.meting_file_name || fileName || 'meeting-file.pdf';

        // Decode base64 to binary
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        // Guess MIME type from file extension
        const ext = name.split('.').pop()?.toLowerCase();
        let mimeType = 'application/octet-stream';
        if (ext === 'pdf') mimeType = 'application/pdf';
        else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'png') mimeType = 'image/png';

        const blob = new Blob([byteArray], { type: mimeType });

        // Trigger download
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = name;
        a.click();
        URL.revokeObjectURL(blobUrl);
      },
      error: (err) => {
        console.error('Download error:', err);
        this.showAlert('❌ Failed to download file.');
      }
    });
  }



  onSubmit(): void {
    if (this.meetingForm.invalid) {
      this.showAlert('Please fill all required fields.');
      return;
    }

    const form = this.meetingForm.value;
    const [m_date, m_time] = form.dateTime.split('T');
    const payload: any = {
      id: 'temp-' + Date.now(),
      title: form.title,
      m_date,
      m_time,
      location: form.location,
      called_by: 'Admin',
      created_by: 'Admin',
      status: 'Scheduled',
      desc: form.desc
    };

    if (this.selectedMeetingFile) {
      const reader = new FileReader();
      reader.onload = () => {
        payload.meting_file = (reader.result as string).split(',')[1];
        payload.meting_file_name = this.selectedMeetingFile?.name || '';
        this.sendMeetingToBackend(payload);
      };
      reader.onerror = () => this.showAlert('Failed to read meeting file.');
      reader.readAsDataURL(this.selectedMeetingFile);
    } else {
      this.sendMeetingToBackend(payload);
    }
  }

  private sendMeetingToBackend(payload: any): void {
    console.log('Payload being sent to backend:', payload);
    this.http.post(this.insertMeetingApiUrl, payload).subscribe({
      next: () => {
        this.showAlert('✅ Meeting scheduled!');
        this.fetchAllMeetings();
        this.meetingForm.reset({ title: '', notifyResidents: false });
        this.selectedMeetingFile = null;
        this.showForm = false;
      },
      error: (err) => {
        console.error('Insert error:', err);
        this.showAlert('❌ Failed to schedule meeting.');
      }
    });
  }

  deleteEvent(id: number): void {
    if (!this.isBrowser || !confirm('Are you sure you want to delete this meeting?')) return;

    const deleteUrl = `${this.deleteMeetingApiUrl}?id=${id}`;

    this.http.get(deleteUrl).subscribe({
      next: () => {
        this.showAlert('🗑️ Meeting deleted!');
        this.fetchAllMeetings(); // This re-fetches from backend
      },
      error: (err) => {
        console.error('Delete failed:', err);
        this.showAlert('❌ Failed to delete meeting.');
      }
    });
  }



  // archiveEvent(id: number): void {
  //   this.showAlert('📁 Archive functionality coming soon.');
  // }

  viewFullEvent(event: Meeting): void {
    this.selectedEvent = event;

    if (this.isBrowser) {
      setTimeout(() => {
        const modalEl = document.getElementById('viewEventModal');
        if (modalEl) {
          const modal = new bootstrap.Modal(modalEl);
          modal.show();
        }
      }, 0);
    }
  }

  filterMeetings(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredEvents = this.events.filter(e =>
      e.title.toLowerCase().includes(term) ||
      e.location.toLowerCase().includes(term) ||
      e.desc.toLowerCase().includes(term)
    );
    this.currentPage = 0;
  }

  paginatedMeetings(): Meeting[] {
    const start = this.currentPage * this.itemsPerPage;
    return this.filteredEvents.slice(start, start + this.itemsPerPage);
  }

  totalPages(): number {
    return Math.ceil(this.filteredEvents.length / this.itemsPerPage);
  }

  totalPagesArray(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i);
  }

  goToPage(index: number): void {
    this.currentPage = index;
  }

  prevPage(): void {
    if (this.currentPage > 0) this.currentPage--;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages() - 1) this.currentPage++;
  }

  private sortEvents(): void {
    this.events.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }

  private showAlert(message: string): void {
    if (this.isBrowser) alert(message);
  }
}
