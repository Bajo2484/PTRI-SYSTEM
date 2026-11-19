import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CocoonCollection } from './cocoon-collection';

describe('CocoonCollection', () => {
  let component: CocoonCollection;
  let fixture: ComponentFixture<CocoonCollection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CocoonCollection],
    }).compileComponents();

    fixture = TestBed.createComponent(CocoonCollection);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
