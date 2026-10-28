import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FarmerOrders } from './farmer-orders';

describe('FarmerOrders', () => {
  let component: FarmerOrders;
  let fixture: ComponentFixture<FarmerOrders>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FarmerOrders],
    }).compileComponents();

    fixture = TestBed.createComponent(FarmerOrders);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
