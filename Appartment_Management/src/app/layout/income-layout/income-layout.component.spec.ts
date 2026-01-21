import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncomeLayoutComponent } from './income-layout.component';

describe('IncomeLayoutComponent', () => {
  let component: IncomeLayoutComponent;
  let fixture: ComponentFixture<IncomeLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncomeLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncomeLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
