import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ServiceEngineerComponent } from './service-engineer.component';

describe('ServiceEngineerComponent', () => {
  let component: ServiceEngineerComponent;
  let fixture: ComponentFixture<ServiceEngineerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceEngineerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ServiceEngineerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
