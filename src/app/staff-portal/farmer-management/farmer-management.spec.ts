import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FarmerManagement } from './farmer-management';

describe('FarmerManagement', () => {
  let component: FarmerManagement;
  let fixture: ComponentFixture<FarmerManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FarmerManagement],
    }).compileComponents();

    fixture = TestBed.createComponent(FarmerManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
