import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorInformationDashboardComponent } from './vendor-information-dashboard.component';

describe('VendorInformationDashboardComponent', () => {
  let component: VendorInformationDashboardComponent;
  let fixture: ComponentFixture<VendorInformationDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorInformationDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendorInformationDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
