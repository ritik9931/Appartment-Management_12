import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  Renderer2,
  Inject,
  PLATFORM_ID,
  ChangeDetectorRef
} from '@angular/core';

import { isPlatformBrowser, CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

export interface PublicNotice {
  id: number;
  title: string;
  description: string;
  created_at: string;
  file_name?: string;
  exp_date?: string;
  created_by?: string;
}

export interface PublicMeeting {
  id: number;
  title: string;
  m_date: string;
  m_time: string;
  location: string;
  called_by: string;
  created_by: string;
  status: string;
  description?: string;
}

export interface ApiResponse<T> {
  message: string;
  status: number;
  Data: T[];
}

@Component({
  selector: 'app-public-page',
  standalone: true,
  imports: [RouterLink, CommonModule, DatePipe],
  templateUrl: './public-page.component.html',
  styleUrl: './public-page.component.css'
})
export class PublicPageComponent implements OnInit, AfterViewInit, OnDestroy {

  // =========================================================
  // Live Notices & Meetings
  // =========================================================

  notices: PublicNotice[] = [];
  meetings: PublicMeeting[] = [];
  isLoadingNotices = false;
  isLoadingMeetings = false;

  selectedNoticeModal: {
    type: 'Notice' | 'Meeting';
    title: string;
    description: string;
    date: string;
    time?: string;
    location?: string;
    by?: string;
    status?: string;
  } | null = null;

  // =========================================================
  // Mobile Drawer
  // =========================================================

  drawerOpen = false;

  // =========================================================
  // Gallery
  // =========================================================

  galleryFilter = 'all';

  // =========================================================
  // Lightbox
  // =========================================================

  lightboxOpen = false;
  lightboxImage = '';
  lightboxAlt = '';

  // =========================================================
  // Testimonial Carousel
  // =========================================================

  currentTestimonial = 0;
  testimonialCount = 0;

  private testimonialTimer: ReturnType<typeof setInterval> | null = null;

  // =========================================================
  // Observers / listeners
  // =========================================================

  private scrollHandler?: () => void;

  private navObserver?: IntersectionObserver;
  private revealObserver?: IntersectionObserver;
  private countObserver?: IntersectionObserver;

  constructor(
    private renderer: Renderer2,
    private elementRef: ElementRef,
    @Inject(PLATFORM_ID) private platformId: object,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadNotices();
    this.loadMeetings();
  }

  loadNotices(): void {
    this.isLoadingNotices = true;
    this.http.get<ApiResponse<PublicNotice>>('https://www.nomad.org.in/rkt/api/rkt/GetTopNotice').subscribe({
      next: (res) => {
        if (res && res.Data && Array.isArray(res.Data)) {
          this.notices = res.Data.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }
        this.isLoadingNotices = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading notices:', err);
        this.isLoadingNotices = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadMeetings(): void {
    this.isLoadingMeetings = true;
    this.http.get<ApiResponse<PublicMeeting>>('https://www.nomad.org.in/rkt/api/rkt/GetTopMeetings').subscribe({
      next: (res) => {
        if (res && res.Data && Array.isArray(res.Data)) {
          this.meetings = res.Data;
        }
        this.isLoadingMeetings = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading meetings:', err);
        this.isLoadingMeetings = false;
        this.cdr.detectChanges();
      }
    });
  }

  openNoticeModal(notice: PublicNotice): void {
    this.selectedNoticeModal = {
      type: 'Notice',
      title: notice.title,
      description: notice.description,
      date: notice.created_at,
      by: notice.created_by
    };
  }

  openMeetingModal(meeting: PublicMeeting): void {
    this.selectedNoticeModal = {
      type: 'Meeting',
      title: meeting.title,
      description: meeting.description || 'Community meeting scheduled.',
      date: meeting.m_date,
      time: meeting.m_time,
      location: meeting.location,
      by: meeting.called_by || meeting.created_by,
      status: meeting.status
    };
  }

  closeNoticeModal(): void {
    this.selectedNoticeModal = null;
  }

  // =========================================================
  // Angular Lifecycle
  // =========================================================

ngAfterViewInit(): void {

  // Do not execute browser-only code during SSR
  if (!isPlatformBrowser(this.platformId)) {
    return;
  }

  this.initStickyHeader();
  this.initActiveNavigation();
  this.initScrollReveal();
  this.initCounters();
  this.initTestimonials();
}

  ngOnDestroy(): void {

  // Browser-only cleanup
  if (isPlatformBrowser(this.platformId)) {

    if (this.scrollHandler) {
      window.removeEventListener(
        'scroll',
        this.scrollHandler
      );
    }

    this.renderer.removeStyle(
      document.body,
      'overflow'
    );

    this.renderer.removeAttribute(
      document.body,
      'data-lightbox-open'
    );
  }

  this.navObserver?.disconnect();
  this.revealObserver?.disconnect();
  this.countObserver?.disconnect();

  this.stopTestimonialAuto();
}

  // =========================================================
  // Sticky Header
  // Original main.js:
  // window.scrollY > 40
  // =========================================================

  private initStickyHeader(): void {
    const header = this.elementRef.nativeElement.querySelector('#siteHeader');

    if (!header) {
      return;
    }

    this.scrollHandler = () => {
      if (window.scrollY > 40) {
        this.renderer.addClass(header, 'scrolled');
      } else {
        this.renderer.removeClass(header, 'scrolled');
      }
    };

    // Run once initially
    this.scrollHandler();

    window.addEventListener('scroll', this.scrollHandler, {
      passive: true
    });
  }

  // =========================================================
  // Active Navigation on Scroll
  // =========================================================

  private initActiveNavigation(): void {
    const navLinks =
      this.elementRef.nativeElement.querySelectorAll('.nav-link');

    if (!navLinks.length) {
      return;
    }

    const sections: HTMLElement[] = [];

    navLinks.forEach((link: HTMLAnchorElement) => {
      const href = link.getAttribute('href');

      if (!href || !href.startsWith('#')) {
        return;
      }

      const section = document.querySelector(href);

      if (section) {
        sections.push(section as HTMLElement);
      }
    });

    if (!sections.length) {
      return;
    }

    this.navObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) {
            return;
          }

          const id = `#${entry.target.id}`;

          navLinks.forEach((link: HTMLAnchorElement) => {
            if (link.getAttribute('href') === id) {
              this.renderer.addClass(link, 'active');
            } else {
              this.renderer.removeClass(link, 'active');
            }
          });
        });
      },
      {
        rootMargin: '-45% 0px -50% 0px'
      }
    );

    sections.forEach(section => {
      this.navObserver?.observe(section);
    });
  }

  // =========================================================
  // Mobile Drawer
  // =========================================================

  toggleDrawer(): void {
    this.drawerOpen = !this.drawerOpen;

    this.updateDrawerState();
  }

  openDrawer(): void {
    this.drawerOpen = true;

    this.updateDrawerState();
  }

  closeDrawer(): void {
    this.drawerOpen = false;

    this.updateDrawerState();
  }

  private updateDrawerState(): void {
    const hamburger =
      this.elementRef.nativeElement.querySelector('#hamburger');

    const drawer =
      this.elementRef.nativeElement.querySelector('#mobileDrawer');

    const backdrop =
      this.elementRef.nativeElement.querySelector('#drawerBackdrop');

    if (this.drawerOpen) {

      if (drawer) {
        this.renderer.addClass(drawer, 'open');
      }

      if (backdrop) {
        this.renderer.addClass(backdrop, 'open');
      }

      if (hamburger) {
        this.renderer.setAttribute(
          hamburger,
          'aria-expanded',
          'true'
        );
      }

      this.renderer.setStyle(
        document.body,
        'overflow',
        'hidden'
      );

    } else {

      if (drawer) {
        this.renderer.removeClass(drawer, 'open');
      }

      if (backdrop) {
        this.renderer.removeClass(backdrop, 'open');
      }

      if (hamburger) {
        this.renderer.setAttribute(
          hamburger,
          'aria-expanded',
          'false'
        );
      }

      this.renderer.removeStyle(
        document.body,
        'overflow'
      );
    }
  }

  // =========================================================
  // Scroll Reveal
  // =========================================================

  private initScrollReveal(): void {

    const revealElements =
      this.elementRef.nativeElement.querySelectorAll('.reveal');

    if (!revealElements.length) {
      return;
    }

    this.revealObserver = new IntersectionObserver(
      entries => {

        entries.forEach((entry, index) => {

          if (!entry.isIntersecting) {
            return;
          }

          const delay = (index % 4) * 90;

          setTimeout(() => {

            this.renderer.addClass(
              entry.target,
              'in-view'
            );

          }, delay);

          this.revealObserver?.unobserve(
            entry.target
          );
        });

      },
      {
        threshold: 0.15
      }
    );

    revealElements.forEach((element: HTMLElement) => {
      this.revealObserver?.observe(element);
    });
  }

  // =========================================================
  // Animated Statistics Counters
  // =========================================================

  private initCounters(): void {

    const counters =
      this.elementRef.nativeElement.querySelectorAll('.stat-num');

    if (!counters.length) {
      return;
    }

    this.countObserver = new IntersectionObserver(
      entries => {

        entries.forEach(entry => {

          if (!entry.isIntersecting) {
            return;
          }

          const element =
            entry.target as HTMLElement;

          const target =
            parseInt(
              element.dataset['count'] ?? '0',
              10
            );

          this.animateCounter(
            element,
            target
          );

          this.countObserver?.unobserve(
            element
          );
        });

      },
      {
        threshold: 0.5
      }
    );

    counters.forEach((counter: HTMLElement) => {
      this.countObserver?.observe(counter);
    });
  }

  private animateCounter(
    element: HTMLElement,
    target: number
  ): void {

    const duration = 1400;
    const start = performance.now();

    const tick = (now: number) => {

      const progress =
        Math.min(
          (now - start) / duration,
          1
        );

      element.textContent =
        Math.floor(progress * target).toString();

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        element.textContent =
          target.toString();
      }
    };

    requestAnimationFrame(tick);
  }

  // =========================================================
  // Gallery Filter
  // Original main.js:
  // all / category
  // =========================================================

  setGalleryFilter(filter: string): void {

    this.galleryFilter = filter;

    const filterButtons =
      this.elementRef.nativeElement.querySelectorAll(
        '.filter-btn'
      );

    const galleryItems =
      this.elementRef.nativeElement.querySelectorAll(
        '.g-item'
      );

    // Update active button
    filterButtons.forEach((button: HTMLElement) => {

      const buttonFilter =
        button.dataset['filter'];

      if (buttonFilter === filter) {
        this.renderer.addClass(
          button,
          'active'
        );
      } else {
        this.renderer.removeClass(
          button,
          'active'
        );
      }

    });

    // Filter gallery
    galleryItems.forEach((item: HTMLElement) => {

      const category =
        item.dataset['cat'];

      const match =
        filter === 'all' ||
        category === filter;

      if (match) {
        this.renderer.removeClass(
          item,
          'hidden'
        );
      } else {
        this.renderer.addClass(
          item,
          'hidden'
        );
      }

    });
  }

  // =========================================================
  // Lightbox
  // =========================================================

  openLightbox(
    imageSrc: string,
    imageAlt: string
  ): void {

    this.lightboxImage = imageSrc;
    this.lightboxAlt = imageAlt;
    this.lightboxOpen = true;

    this.renderer.setAttribute(
      document.body,
      'data-lightbox-open',
      'true'
    );
  }

  closeLightbox(): void {

    this.lightboxOpen = false;
    this.lightboxImage = '';
    this.lightboxAlt = '';

    this.renderer.removeAttribute(
      document.body,
      'data-lightbox-open'
    );
  }

  // =========================================================
  // Testimonial Carousel
  // =========================================================

  private initTestimonials(): void {

    const track =
      this.elementRef.nativeElement.querySelector(
        '#tTrack'
      );

    if (!track) {
      return;
    }

    this.testimonialCount =
      track.children.length;

    if (this.testimonialCount <= 1) {
      return;
    }

    this.startTestimonialAuto();
  }

  goToTestimonial(index: number): void {

    if (this.testimonialCount === 0) {
      return;
    }

    this.currentTestimonial =
      (
        index +
        this.testimonialCount
      ) %
      this.testimonialCount;
  }

  nextTestimonial(): void {

    this.goToTestimonial(
      this.currentTestimonial + 1
    );

    this.restartTestimonialAuto();
  }

  previousTestimonial(): void {

    this.goToTestimonial(
      this.currentTestimonial - 1
    );

    this.restartTestimonialAuto();
  }

  private startTestimonialAuto(): void {

    this.stopTestimonialAuto();

    this.testimonialTimer =
      setInterval(() => {

        this.goToTestimonial(
          this.currentTestimonial + 1
        );

      }, 5500);
  }

  private stopTestimonialAuto(): void {

    if (this.testimonialTimer) {

      clearInterval(
        this.testimonialTimer
      );

      this.testimonialTimer = null;
    }
  }

  private restartTestimonialAuto(): void {

    this.stopTestimonialAuto();

    this.startTestimonialAuto();
  }

  pauseTestimonialAuto(): void {
    this.stopTestimonialAuto();
  }

  resumeTestimonialAuto(): void {
    this.startTestimonialAuto();
  }

  // =========================================================
  // Testimonial Track Transform
  // =========================================================

  get testimonialTransform(): string {

    return `translateX(-${this.currentTestimonial * 100}%)`;
  }
  
  get testimonialIndexes(): number[] {
  return Array.from(
    { length: this.testimonialCount },
    (_, index) => index
  );
}
}