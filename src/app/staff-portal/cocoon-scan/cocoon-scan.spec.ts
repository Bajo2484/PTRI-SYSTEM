import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CocoonScan } from './cocoon-scan';

describe('CocoonScan', () => {
  let component: CocoonScan;
  let fixture: ComponentFixture<CocoonScan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CocoonScan],
    }).compileComponents();

    fixture = TestBed.createComponent(CocoonScan);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
