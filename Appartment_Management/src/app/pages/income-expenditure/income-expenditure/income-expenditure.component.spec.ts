import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncomeExpenditureComponent } from './income-expenditure.component';

describe('IncomeExpenditureComponent', () => {
  let component: IncomeExpenditureComponent;
  let fixture: ComponentFixture<IncomeExpenditureComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncomeExpenditureComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncomeExpenditureComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
