import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncomeDashboardComponent } from './income-dashboard.component';

describe('IncomeDashboardComponent', () => {
  let component: IncomeDashboardComponent;
  let fixture: ComponentFixture<IncomeDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncomeDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncomeDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
