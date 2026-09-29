import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { IncomeLayoutComponent } from './layout/income-layout/income-layout.component';
import { NoticeBoardLayoutComponent } from './layout/notice-board-layout/notice-board-layout.component';
import { ReportsAnalyticsLayoutComponent } from './layout/reports-analytics-layout/reports-analytics-layout.component';
import { ComplaintLayoutComponent } from './layout/complaint-layout/complaint-layout.component';
import { VendorInformationLayoutComponent } from './layout/vendor-information-layout/vendor-information-layout.component';

export const routes: Routes = [
  // {
  //   path: '',
  //   redirectTo: 'sign-in',
  //   pathMatch: 'full'
  // },
  {
  path: '',
  loadComponent: () =>
    import('./public/public-page/public-page.component')
      .then(m => m.PublicPageComponent)
},
{
  path: 'visitor',
  loadComponent: () =>
    import('./public/visitor-page/visitor-page.component')
      .then(m => m.VisitorPageComponent)
},
  {
    path: 'sign-in',
    loadComponent: () => import('./sign-in/sign-in.component').then(m => m.SignInComponent)
  },
  {
    path: 'menu',
    loadComponent: () => import('./menu/menu.component').then(m => m.MenuComponent)
  },
  {
    path: 'menu',
    component: MainLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/profile_management/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          )
      },
      {
        path: 'profile-management',
        loadComponent: () =>
          import('./pages/profile_management/resident-profile/resident-profile.component').then(
            (m) => m.ProfileManagementComponent
          )
      },
      {
        path: 'service-engineer',
        loadComponent: () =>
          import('./pages/profile_management/service-engineer/service-engineer.component').then(
            (m) => m.ServiceEngineerComponent
          )
      },
      {
        path: 'apartment-committee-member',
        loadComponent: () =>
          import('./pages/profile_management/apartment-committee-member/apartment-committee-member.component').then(
            (m) => m.ApartmentCommitteeMemberComponent
          )
      },
    ]
  },
  {
    path: 'income',
    component: IncomeLayoutComponent,
    children: [
      {
        path: 'income-dashboard',
        loadComponent: () =>
          import('./pages/income-expenditure/income-dashboard/income-dashboard.component').then(
            (m) => m.IncomeDashboardComponent
          )
      },
      {
        path: 'income-expenditure',
        loadComponent: () =>
          import('./pages/income-expenditure/income-expenditure/income-expenditure.component').then(
            (m) => m.IncomeExpenditureComponent
          )
      },
      {
        path: 'defaulter',
        loadComponent: () =>
          import('./pages/income-expenditure/defaulter/defaulter.component').then(
            (m) => m.DefaulterComponent
          )
      }
    ]
  },

// Route for Complaint

  {
  path: 'menu',
  component: ComplaintLayoutComponent,
  children: [
    {
      path: 'complaint-dashboard',
      loadComponent: () =>
        import('./pages/complaint/complaint-dashboard/complaint-dashboard.component').then(
          m => m.ComplaintDashboardComponent
        )
    },
    {
      path: 'complaint',
      loadComponent: () =>
        import('./pages/complaint/complaint/complaint.component').then(
          m => m.ComplaintComponent
        )
    },
    {
      path: 'complaint-status',
      loadComponent: () =>
        import('./pages/complaint/complaint-status/complaint-status.component').then(
          m => m.ComplaintStatusComponent
        )
    }
  ]
},

// Route for Notice Board

{
  path: 'menu',
  component: NoticeBoardLayoutComponent,
  children: [
    {
        path: 'notice-board-dashboard',
        loadComponent: () =>
          import('./pages/notice-board/notice-board-dashboard/notice-board-dashboard.component').then(
            (m) => m.NoticeBoardDashboardComponent
          )
      },
    {
      path: 'notice-board',
      loadComponent: () =>
        import('./pages/notice-board/notice-board/notice-board.component').then(
          m => m.NoticeBoardComponent
        )
    },
    {
        path: 'upcoming-meeting',
        loadComponent: () =>
          import('./pages/notice-board/upcoming-meeting/upcoming-meeting.component').then(
            (m) => m.UpcomingMeetingComponent
          )
      },
      {
      path: 'meeting-outcome',
      loadComponent: () =>
        import('./pages/notice-board/meeting-outcome/meeting-outcome.component').then(
          m => m.MeetingOutcomeComponent
        )
    },
  ]
},

// Route for Report & Analytics

{
  path: 'menu',
  component: ReportsAnalyticsLayoutComponent,
  children: [
    {
        path: 'report-analytics-dashboard',
        loadComponent: () =>
          import('./pages/reports-analytics/report-analytics-dashboard/report-analytics-dashboard.component').then(
            (m) => m.ReportAnalyticsDashboardComponent
          )
      },
    {
      path: 'report-analytics',
      loadComponent: () =>
        import('./pages/reports-analytics/report-analytics/report-analytics.component').then(
          m => m.ReportAnalyticsComponent
      )
    },  
  ]
},

// Route for Vendor Information

{
  path: 'menu',
  component: VendorInformationLayoutComponent,
  children: [
    {
        path: 'vendor-information-dashboard',
        loadComponent: () =>
          import('./pages/vendor-information/vendor-information-dashboard/vendor-information-dashboard.component').then(
            (m) => m.VendorInformationDashboardComponent
          )
      }, 
  ]
},

  {
    path: '**',
    redirectTo: 'sign-in'
  }
];
