import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SilkwormPreparation } from './silkworm-preparation';

describe('SilkwormPreparation', () => {
  let component: SilkwormPreparation;
  let fixture: ComponentFixture<SilkwormPreparation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SilkwormPreparation],
    }).compileComponents();

    fixture = TestBed.createComponent(SilkwormPreparation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
