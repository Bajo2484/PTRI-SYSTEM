import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CocoonProduction } from './cocoon-production';

describe('CocoonProduction', () => {
  let component: CocoonProduction;
  let fixture: ComponentFixture<CocoonProduction>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CocoonProduction],
    }).compileComponents();

    fixture = TestBed.createComponent(CocoonProduction);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
