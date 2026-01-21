import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApartmentCommitteeMemberComponent } from './apartment-committee-member.component';

describe('ApartmentCommitteeMemberComponent', () => {
  let component: ApartmentCommitteeMemberComponent;
  let fixture: ComponentFixture<ApartmentCommitteeMemberComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApartmentCommitteeMemberComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApartmentCommitteeMemberComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
