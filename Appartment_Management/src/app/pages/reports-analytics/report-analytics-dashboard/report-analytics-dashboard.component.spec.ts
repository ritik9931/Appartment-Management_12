import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportAnalyticsDashboardComponent } from './report-analytics-dashboard.component';

describe('ReportAnalyticsDashboardComponent', () => {
  let component: ReportAnalyticsDashboardComponent;
  let fixture: ComponentFixture<ReportAnalyticsDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportAnalyticsDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportAnalyticsDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
