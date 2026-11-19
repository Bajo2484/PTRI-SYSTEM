import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PruningDateDetails } from './pruning-date-details';

describe('PruningDateDetails', () => {
  let component: PruningDateDetails;
  let fixture: ComponentFixture<PruningDateDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PruningDateDetails],
    }).compileComponents();

    fixture = TestBed.createComponent(PruningDateDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
