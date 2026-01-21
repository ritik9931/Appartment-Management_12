import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeetingOutcomeComponent } from './meeting-outcome.component';

describe('MeetingOutcomeComponent', () => {
  let component: MeetingOutcomeComponent;
  let fixture: ComponentFixture<MeetingOutcomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MeetingOutcomeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeetingOutcomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
