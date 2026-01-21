import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportsAnalyticsLayoutComponent } from './reports-analytics-layout.component';

describe('ReportsAnalyticsLayoutComponent', () => {
  let component: ReportsAnalyticsLayoutComponent;
  let fixture: ComponentFixture<ReportsAnalyticsLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportsAnalyticsLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportsAnalyticsLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
