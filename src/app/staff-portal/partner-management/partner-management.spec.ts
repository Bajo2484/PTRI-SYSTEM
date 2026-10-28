import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartnerManagement } from './partner-management';

describe('PartnerManagement', () => {
  let component: PartnerManagement;
  let fixture: ComponentFixture<PartnerManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnerManagement],
    }).compileComponents();

    fixture = TestBed.createComponent(PartnerManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
