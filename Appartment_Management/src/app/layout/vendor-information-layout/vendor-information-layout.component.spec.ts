import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorInformationLayoutComponent } from './vendor-information-layout.component';

describe('VendorInformationLayoutComponent', () => {
  let component: VendorInformationLayoutComponent;
  let fixture: ComponentFixture<VendorInformationLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorInformationLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendorInformationLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
