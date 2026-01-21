import { Component, Inject, OnInit, PLATFORM_ID, ViewChild, ElementRef, AfterViewInit} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule,} from '@angular/forms';
import { HttpClient, HttpClientModule, HttpParams } from '@angular/common/http';
import { CommonModule, isPlatformBrowser } from '@angular/common';

declare var bootstrap: any;

interface RawNoticeFromApi {
  id: number;
  title: string;
  description: string;
  created_at: string;
  exp_date: string;
  created_by: string;
  file_name: string;
  status: string | null;
}

interface NoticesApiResponse {
  message: string;
  status: number;
  Data: RawNoticeFromApi[];
}

interface Notice {
  id: number;
  title: string;
  description: string;
  postedDate: Date;
  attachmentUrl?: string | null;
  expiryDate?: Date | null;
  file_name?: string | null;
  created_by?: string | null;
}

@Component({
  selector: 'app-notice-board',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, FormsModule],
  templateUrl: './notice-board.component.html',
  styleUrls: ['./notice-board.component.css']
})
export class NoticeBoardComponent implements OnInit, AfterViewInit {
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('viewModal') viewModal!: ElementRef;

  noticeForm: FormGroup;
  notices: Notice[] = [];
  filteredNotices: Notice[] = [];
  selectedFile: File | null = null;
  base64File: string | null = null;
  selectedNotice: Notice | null = null;
  viewModalInstance: any;

  isAdmin = false;
  showForm = false;
  loading = false;
  showToast = false;
  errorMessage = '';

  currentPage = 0;
  pageSize = 5;
  totalPages = 0;
  searchTerm = '';
  today = new Date();
  todayString = this.formatToYYYYMMDD(this.today);

  private isBrowser: boolean;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.noticeForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      expiryDate: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      const role = localStorage.getItem('userRole');
      this.isAdmin = role === 'admin';
    }
    this.fetchAllNotices();
  }

  ngAfterViewInit(): void {
    if (this.viewModal?.nativeElement) {
      this.viewModal.nativeElement.addEventListener('hidden.bs.modal', () => {
        this.selectedNotice = null;
        this.viewModalInstance = null;
      });
    }
  }

  openNoticeModal(notice: Notice): void {
    this.selectedNotice = notice;
    if (!this.viewModalInstance) {
      this.viewModalInstance = new bootstrap.Modal(this.viewModal.nativeElement);
    }
    this.viewModalInstance.show();
  }

  fetchAllNotices(): void {
    this.loading = true;
    this.http.get<NoticesApiResponse>(`/rktapi/api/rkt/GetAllNotice?t=${Date.now()}`).subscribe({
      next: (response) => {
        if (response?.Data) {
         this.notices = response.Data
  .filter(raw => raw.status === null) // ✅ Only include status: null
  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  .map(raw => ({
    id: raw.id,
    title: raw.title,
    description: raw.description,
    postedDate: new Date(raw.created_at),
    expiryDate: raw.exp_date ? new Date(raw.exp_date) : null,
    attachmentUrl: raw.file_name ? `/rktapi/api/rkt/DownloadNoticeAttachment?fileName=${raw.file_name}` : null,
    file_name: raw.file_name,
    created_by: raw.created_by
  }));

          this.filterNotices();
        } else {
          this.notices = [];
          this.filteredNotices = [];
        }
      },
      error: err => {
        console.error('Fetch error:', err);
        this.errorMessage = 'Failed to fetch notices.';
      },
      complete: () => this.loading = false
    });
  }

  filterNotices(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredNotices = this.notices.filter(n =>
      n.title.toLowerCase().includes(term) || n.description.toLowerCase().includes(term)
    );
    this.totalPages = Math.ceil(this.filteredNotices.length / this.pageSize);
    this.currentPage = 0;
  }

  paginatedNotices(): Notice[] {
    const start = this.currentPage * this.pageSize;
    return this.filteredNotices.slice(start, start + this.pageSize);
  }

  totalPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) this.currentPage++;
  }

  prevPage(): void {
    if (this.currentPage > 0) this.currentPage--;
  }

  goToPage(page: number): void {
    this.currentPage = page;
  }

  isNoticeExpired(notice: Notice): boolean {
    const expiry = new Date(notice.expiryDate ?? '');
    expiry.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return expiry < today;
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0];
      const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
      if (!allowed.includes(this.selectedFile.type)) {
        alert('Only PDF, PNG, JPG allowed.');
        this.selectedFile = null;
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.base64File = (reader.result as string).split(',')[1];
      };
      reader.readAsDataURL(this.selectedFile);
    } else {
      this.selectedFile = null;
      this.base64File = null;
    }
  }

  onPostNotice(): void {
    if (this.noticeForm.invalid) {
      this.noticeForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    const payload = {
      title: this.noticeForm.value.title,
      description: this.noticeForm.value.description,
      exp_date: this.noticeForm.value.expiryDate,
      created_at: new Date().toISOString(),
      file_content: this.base64File,
      file_name: this.selectedFile?.name || null,
      created_by: localStorage.getItem('username') || 'Admin'
    };

    this.http.post<any>('/rktapi/api/rkt/InsertNotice', payload, {
      headers: { 'Content-Type': 'application/json' }
    }).subscribe({
      next: () => {
        this.fetchAllNotices();
        this.noticeForm.reset();
        this.selectedFile = null;
        this.base64File = null;
        if (this.fileInput?.nativeElement) this.fileInput.nativeElement.value = '';
        this.showToast = true;
        setTimeout(() => this.showToast = false, 3000);
        this.showForm = false;
      },
      error: err => {
        console.error('Insert error:', err);
        this.errorMessage = 'Failed to post notice.';
      },
      complete: () => this.loading = false
    });
  }

  deleteNotice(id: number): void {
    if (confirm('Are you sure you want to delete this notice?')) {
      const params = new HttpParams().set('id', id.toString());
      this.http.get('/rktapi/api/rkt/DeleteNotice', { params }).subscribe({
        next: () => this.fetchAllNotices(),
        error: err => {
          console.error('Delete error:', err);
          alert('Failed to delete notice.');
        }
      });
    }
  }

  // archiveNotice(id: number): void {
  //   alert(`Notice ${id} archived. Add your archive logic here.`);
  // }

  formatToYYYYMMDD(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // ✅ New: Download attachment by Notice ID using Blob
  downloadAttachment(notice: Notice): void {
    if (!notice.id) {
      alert('Invalid notice ID.');
      return;
    }

    this.http.get(`/rktapi/api/rkt/DownloadNotice`, {
      params: new HttpParams().set('id', notice.id.toString()),
      responseType: 'blob'
    }).subscribe({
      next: (blob: Blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = notice.file_name || 'notice_attachment';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
      },
      error: (err) => {
        console.error('Download failed:', err);
        alert('Failed to download attachment.');
      }
    });
  }
}
