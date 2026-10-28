import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SupplyDelivery } from './supply-delivery';

describe('SupplyDelivery', () => {
  let component: SupplyDelivery;
  let fixture: ComponentFixture<SupplyDelivery>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SupplyDelivery],
    }).compileComponents();

    fixture = TestBed.createComponent(SupplyDelivery);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
