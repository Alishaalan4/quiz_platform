import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuizTake } from './quiz-take';

describe('QuizTake', () => {
  let component: QuizTake;
  let fixture: ComponentFixture<QuizTake>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuizTake]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuizTake);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
