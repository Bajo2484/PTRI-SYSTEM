import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FarmerDeliveries } from './farmer-deliveries';

describe('FarmerDeliveries', () => {
  let component: FarmerDeliveries;
  let fixture: ComponentFixture<FarmerDeliveries>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FarmerDeliveries],
    }).compileComponents();

    fixture = TestBed.createComponent(FarmerDeliveries);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
