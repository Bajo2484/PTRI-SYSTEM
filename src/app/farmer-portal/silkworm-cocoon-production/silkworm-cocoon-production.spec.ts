import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SilkwormCocoonProduction } from './silkworm-cocoon-production';

describe('SilkwormCocoonProduction', () => {
  let component: SilkwormCocoonProduction;
  let fixture: ComponentFixture<SilkwormCocoonProduction>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SilkwormCocoonProduction],
    }).compileComponents();

    fixture = TestBed.createComponent(SilkwormCocoonProduction);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
