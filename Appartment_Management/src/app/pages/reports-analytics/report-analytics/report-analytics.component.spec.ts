import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportAnalyticsComponent } from './report-analytics.component';

describe('ReportAnalyticsComponent', () => {
  let component: ReportAnalyticsComponent;
  let fixture: ComponentFixture<ReportAnalyticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportAnalyticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
