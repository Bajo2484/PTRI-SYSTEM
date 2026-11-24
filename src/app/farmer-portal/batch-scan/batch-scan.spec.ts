import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BatchScan } from './batch-scan';

describe('BatchScan', () => {
  let component: BatchScan;
  let fixture: ComponentFixture<BatchScan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatchScan],
    }).compileComponents();

    fixture = TestBed.createComponent(BatchScan);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
