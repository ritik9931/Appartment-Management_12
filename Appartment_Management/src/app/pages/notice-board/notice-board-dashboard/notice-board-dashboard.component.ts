import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

// Interfaces
interface MeetingResponse {
  id: number;
  title: string;
  type?: string;
  m_date: string;
  m_time: string;
  location: string;
  called_by: string;
  created_by: string;
  status: string;
  description?: string;
}

interface MeetingDisplay {
  id: number;
  title: string;
  type: string;
  location: string;
  called_by: string;
  created_by: string;
  status: string;
  dateTime: Date;
  description?: string;
}

interface Notice {
  id: number;
  title: string;
  description: string;
  created_at: string;
  file_name?: string | null; // Added for download API
}

interface ApiResponse<T> {
  Data: T[];
}

@Component({
  selector: 'app-notice-board-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notice-board-dashboard.component.html',
  styleUrls: ['./notice-board-dashboard.component.css']
})
export class NoticeBoardDashboardComponent implements OnInit {
  latestNotices: Notice[] = [];
  latestMeetings: MeetingDisplay[] = [];
  currentYear: number = new Date().getFullYear();

  showAllNotices = false;
  showAllMeetings = false;

  showNoticeDetailModal = false;
  selectedNotice: Notice | null = null;

  showMeetingDetailModal = false;
  selectedMeeting: MeetingDisplay | null = null;

  isLoggedIn = true;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    if (this.isLoggedIn) {
      this.loadNotices();
      this.loadMeetings();
    }
  }

loadNotices() {
  this.http.get<ApiResponse<Notice>>('/rktapi/api/rkt/GetTopNotice').subscribe(response => {
    this.latestNotices = response?.Data
      ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || [];
  });
}

loadMeetings() {
  this.http.get<ApiResponse<MeetingResponse>>('/rktapi/api/rkt/GetTopMeetings').subscribe(response => {
    const processedMeetings: MeetingDisplay[] = (response?.Data || []).map((meeting) => {
      const dateTime = new Date(meeting.m_date);
      return {
        ...meeting,
        type: meeting.type || meeting.title,
        dateTime: isNaN(dateTime.getTime()) ? new Date() : dateTime,
        description: meeting.description || 'No description available.'
      };
    });

    this.latestMeetings = processedMeetings
      .sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime());
  });
}


  toggleNotices() {
    this.showAllNotices = !this.showAllNotices;
  }

  toggleMeetings() {
    this.showAllMeetings = !this.showAllMeetings;
  }

  // Modal methods for Notices
  openNoticeModal(notice: Notice) {
    this.selectedNotice = notice;
    this.showNoticeDetailModal = true;
  }

  closeNoticeDetailModal() {
    this.showNoticeDetailModal = false;
    this.selectedNotice = null;
  }

  // Modal methods for Meetings
  openMeetingModal(meeting: MeetingDisplay) {
    this.selectedMeeting = meeting;
    this.showMeetingDetailModal = true;
  }

  closeMeetingDetailModal() {
    this.showMeetingDetailModal = false;
    this.selectedMeeting = null;
  }

  // Download attachment logic
  downloadNoticeAttachment(notice: Notice) {
    if (!notice?.id) return;

    const apiUrl = `/rktapi/api/rkt/DownloadNotice?id=${notice.id}`;
    this.http.get(apiUrl, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = notice.file_name || `notice_${notice.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      },
      error: (err) => {
        console.error('Download failed:', err);
        alert('Failed to download the attachment.');
      }
    });
  }
}
