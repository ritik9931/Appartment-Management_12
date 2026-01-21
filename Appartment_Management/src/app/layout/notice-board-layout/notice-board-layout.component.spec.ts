import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoticeBoardLayoutComponent } from './notice-board-layout.component';

describe('NoticeBoardLayoutComponent', () => {
  let component: NoticeBoardLayoutComponent;
  let fixture: ComponentFixture<NoticeBoardLayoutComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoticeBoardLayoutComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoticeBoardLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
