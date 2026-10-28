import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FarmerProduction } from './farmer-production';

describe('FarmerProduction', () => {
  let component: FarmerProduction;
  let fixture: ComponentFixture<FarmerProduction>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FarmerProduction],
    }).compileComponents();

    fixture = TestBed.createComponent(FarmerProduction);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
