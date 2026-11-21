import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicCocoonReturn } from './public-cocoon-return';

describe('PublicCocoonReturn', () => {
  let component: PublicCocoonReturn;
  let fixture: ComponentFixture<PublicCocoonReturn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicCocoonReturn],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicCocoonReturn);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
