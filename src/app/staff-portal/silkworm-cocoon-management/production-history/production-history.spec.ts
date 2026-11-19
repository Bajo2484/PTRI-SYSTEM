import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductionHistory } from './production-history';

describe('ProductionHistory', () => {
  let component: ProductionHistory;
  let fixture: ComponentFixture<ProductionHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductionHistory],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductionHistory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
