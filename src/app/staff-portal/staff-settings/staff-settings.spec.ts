import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaffSettings } from './staff-settings';

describe('StaffSettings', () => {
  let component: StaffSettings;
  let fixture: ComponentFixture<StaffSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffSettings],
    }).compileComponents();

    fixture = TestBed.createComponent(StaffSettings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
