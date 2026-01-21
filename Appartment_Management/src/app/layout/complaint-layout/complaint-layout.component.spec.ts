import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComplaintLayoutComponent } from './complaint-layout.component';

describe('ComplaintLayoutComponent', () => {
  let component: ComplaintLayoutComponent;
  let fixture: ComponentFixture<ComplaintLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ComplaintLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ComplaintLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
