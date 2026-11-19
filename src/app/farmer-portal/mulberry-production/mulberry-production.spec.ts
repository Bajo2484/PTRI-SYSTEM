import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MulberryProduction } from './mulberry-production';

describe('MulberryProduction', () => {
  let component: MulberryProduction;
  let fixture: ComponentFixture<MulberryProduction>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MulberryProduction],
    }).compileComponents();

    fixture = TestBed.createComponent(MulberryProduction);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
