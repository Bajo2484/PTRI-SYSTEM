import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SilkwormCocoonManagement } from './silkworm-cocoon-management';

describe('SilkwormCocoonManagement', () => {
  let component: SilkwormCocoonManagement;
  let fixture: ComponentFixture<SilkwormCocoonManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SilkwormCocoonManagement],
    }).compileComponents();

    fixture = TestBed.createComponent(SilkwormCocoonManagement);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
