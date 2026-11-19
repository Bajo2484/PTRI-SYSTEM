import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MulberryProductionMonitoring } from './mulberry-production-monitoring';

describe('MulberryProductionMonitoring', () => {
  let component: MulberryProductionMonitoring;
  let fixture: ComponentFixture<MulberryProductionMonitoring>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MulberryProductionMonitoring],
    }).compileComponents();

    fixture = TestBed.createComponent(MulberryProductionMonitoring);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
