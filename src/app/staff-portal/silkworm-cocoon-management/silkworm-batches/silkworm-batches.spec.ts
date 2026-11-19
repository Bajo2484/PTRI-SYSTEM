import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SilkwormBatches } from './silkworm-batches';

describe('SilkwormBatches', () => {
  let component: SilkwormBatches;
  let fixture: ComponentFixture<SilkwormBatches>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SilkwormBatches],
    }).compileComponents();

    fixture = TestBed.createComponent(SilkwormBatches);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
