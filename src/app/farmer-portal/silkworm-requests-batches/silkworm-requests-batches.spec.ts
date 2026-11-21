import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SilkwormRequestsBatches } from './silkworm-requests-batches';

describe('SilkwormRequestsBatches', () => {
  let component: SilkwormRequestsBatches;
  let fixture: ComponentFixture<SilkwormRequestsBatches>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SilkwormRequestsBatches],
    }).compileComponents();

    fixture = TestBed.createComponent(SilkwormRequestsBatches);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
