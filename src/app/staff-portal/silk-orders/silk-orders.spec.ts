import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SilkOrders } from './silk-orders';

describe('SilkOrders', () => {
  let component: SilkOrders;
  let fixture: ComponentFixture<SilkOrders>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SilkOrders],
    }).compileComponents();

    fixture = TestBed.createComponent(SilkOrders);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
