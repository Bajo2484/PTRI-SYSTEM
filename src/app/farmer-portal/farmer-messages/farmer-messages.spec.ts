import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FarmerMessages } from './farmer-messages';

describe('FarmerMessages', () => {
  let component: FarmerMessages;
  let fixture: ComponentFixture<FarmerMessages>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FarmerMessages],
    }).compileComponents();

    fixture = TestBed.createComponent(FarmerMessages);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
