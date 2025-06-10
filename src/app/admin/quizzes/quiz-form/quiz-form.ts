import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { QuizService, Quiz, Question, Option } from '../../../services/quiz.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-quiz-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './quiz-form.html',
  styleUrl: './quiz-form.css'
})
export class QuizForm implements OnInit, OnDestroy {
  quizForm!: FormGroup;
  quizId: string | null = null;
  isEditMode = false;
  loading = false;
  error = '';
  success = '';
  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private quizService: QuizService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initForm();
    
    const routeSub = this.route.paramMap.subscribe(params => {
      this.quizId = params.get('id');
      this.isEditMode = !!this.quizId;
      
      if (this.isEditMode && this.quizId) {
        this.loadQuiz(this.quizId);
      }
    });
    
    this.subscriptions.add(routeSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  initForm(): void {
    this.quizForm = this.fb.group({
      title: ['', [Validators.required]],
      description: ['', [Validators.required]],
      category: ['easy', [Validators.required]],
      status: ['pending', [Validators.required]],
      totalGrade: [100, [Validators.required, Validators.min(0)]],
      questions: this.fb.array([])
    });
    
    // Add at least one question by default
    this.addQuestion();
  }
  
  // Convenience getters for form access
  get questionsArray(): FormArray {
    return this.quizForm.get('questions') as FormArray;
  }
  
  getOptionsArray(questionIndex: number): FormArray {
    return this.questionsArray.at(questionIndex).get('options') as FormArray;
  }
  
  loadQuiz(id: string): void {
    const quizSub = this.quizService.getQuiz(id).subscribe({
      next: (quiz) => {
        if (quiz) {
          // Clear the default questions first
          while (this.questionsArray.length) {
            this.questionsArray.removeAt(0);
          }
          
          // Set form values
          this.quizForm.patchValue({
            title: quiz.title,
            description: quiz.description,
            category: quiz.category,
            status: quiz.status,
            totalGrade: quiz.totalGrade
          });
          
          // Add questions and options
          if (quiz.questions && quiz.questions.length > 0) {
            quiz.questions.forEach(question => {
              const questionGroup = this.createQuestionFormGroup();
              questionGroup.patchValue({
                text: question.text,
                grade: question.grade,
                correctOptionIndex: question.correctOptionIndex
              });
              
              // Clear default options
              const optionsArray = questionGroup.get('options') as FormArray;
              while (optionsArray.length) {
                optionsArray.removeAt(0);
              }
              
              // Add options
              if (question.options && question.options.length > 0) {
                question.options.forEach(option => {
                  optionsArray.push(this.createOptionFormGroup(option.text));
                });
              }
              
              this.questionsArray.push(questionGroup);
            });
          }
        } else {
          this.error = 'Quiz not found';
          this.router.navigate(['/admin/quizzes']);
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load quiz';
        this.loading = false;
        console.error('Error loading quiz:', err);
      }
    });
    
    this.subscriptions.add(quizSub);
  }
  
  createQuestionFormGroup(): FormGroup {
    const questionGroup = this.fb.group({
      text: ['', [Validators.required]],
      grade: [10, [Validators.required, Validators.min(0)]],
      correctOptionIndex: [0, [Validators.required]],
      options: this.fb.array([])
    });
    
    // Add 4 default options
    const optionsArray = questionGroup.get('options') as FormArray;
    for (let i = 0; i < 4; i++) {
      optionsArray.push(this.createOptionFormGroup(`Option ${i + 1}`));
    }
    
    return questionGroup;
  }
  
  createOptionFormGroup(text: string = ''): FormGroup {
    return this.fb.group({
      text: [text, [Validators.required]]
    });
  }
  
  addQuestion(): void {
    this.questionsArray.push(this.createQuestionFormGroup());
    this.updateTotalGrade();
  }
  
  removeQuestion(index: number): void {
    if (this.questionsArray.length > 1) {
      this.questionsArray.removeAt(index);
      this.updateTotalGrade();
    } else {
      this.error = 'Quiz must have at least one question';
      setTimeout(() => this.error = '', 3000);
    }
  }
  
  updateTotalGrade(): void {
    const totalGrade = this.questionsArray.controls.reduce(
      (sum, question) => sum + (+question.get('grade')!.value || 0), 
      0
    );
    this.quizForm.patchValue({ totalGrade });
  }
  
  onGradeChange(): void {
    this.updateTotalGrade();
  }
  
  onSubmit(): void {
    if (this.quizForm.invalid) {
      this.markFormGroupTouched(this.quizForm);
      this.error = 'Please fix the errors in the form';
      return;
    }

    const quizData: Quiz = this.quizForm.value;
    
    // Add createdAt for new quizzes
    if (!this.isEditMode) {
      quizData.createdAt = new Date().toISOString();
    }

    if (this.isEditMode && this.quizId) {
      const updateSub = this.quizService.updateQuiz(this.quizId, quizData).subscribe({
        next: () => {
          this.router.navigate(['/admin/quizzes']);
        },
        error: (err) => {
          this.error = err.message || 'Failed to update quiz';
          console.error('Error updating quiz:', err);
        }
      });
      
      this.subscriptions.add(updateSub);
    } else {
      const createSub = this.quizService.createQuiz(quizData).subscribe({
        next: (quizId) => {
          console.log('Quiz created with ID:', quizId);
          this.router.navigate(['/admin/quizzes']);
        },
        error: (err) => {
          this.error = err.message || 'Failed to create quiz';
          console.error('Error creating quiz:', err);
        }
      });
      
      this.subscriptions.add(createSub);
    }
  }
  
  markFormGroupTouched(formGroup: FormGroup | FormArray) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      }
    });
  }
  
  cancel(): void {
    this.router.navigate(['/admin/quizzes']);
  }
}
