import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoticeBoardDashboardComponent } from './notice-board-dashboard.component';

describe('NoticeBoardDashboardComponent', () => {
  let component: NoticeBoardDashboardComponent;
  let fixture: ComponentFixture<NoticeBoardDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoticeBoardDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoticeBoardDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
