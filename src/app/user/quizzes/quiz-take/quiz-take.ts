import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuizService, Quiz, Question } from '../../../services/quiz.service';
import { QuizAttemptService, QuizAttempt, QuizAnswer } from '../../../services/quiz-attempt.service';
import { Auth } from '../../../services/auth';

@Component({
  selector: 'app-quiz-take',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './quiz-take.html',
  styleUrl: './quiz-take.css'
})
export class QuizTake implements OnInit {
  quiz: Quiz | null = null;
  loading = false; // Set initial loading to false for immediate display
  error = '';
  currentQuestionIndex = 0;
  selectedOptionIndexes: number[] = [];
  quizCompleted = false;
  finalScore = 0;
  totalGrade = 0;
  scorePercentage = 0;
  userName = 'User';
  userId = '';
  
  // Flag to prevent multiple submissions
  submitting = false;

  constructor(
    private quizService: QuizService,
    private quizAttemptService: QuizAttemptService,
    private authService: Auth,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Get user info
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.userId = currentUser.uid;
      if (currentUser.displayName) {
        this.userName = currentUser.displayName;
      }
    } else {
      // Redirect if not logged in
      this.router.navigate(['/user/login']);
    }
  }

  ngOnInit(): void {
    this.loadQuiz();
  }

  loadQuiz(): void {
    const quizId = this.route.snapshot.paramMap.get('id');
    if (!quizId) {
      this.error = 'Quiz ID not provided';
      return;
    }

    // Check if user has already taken this quiz
    this.quizAttemptService.hasAttemptedQuiz(quizId).subscribe({
      next: (hasAttempted) => {
        if (hasAttempted) {
          this.error = 'You have already taken this quiz';
        } else {
          // Load the quiz - use cached data if available
          this.quizService.getQuiz(quizId).subscribe({
            next: (quiz) => {
              if (quiz) {
                this.quiz = quiz;
                this.totalGrade = quiz.totalGrade;
                this.initializeSelectedOptions();
              } else {
                this.error = 'Quiz not found';
              }
            },
            error: (err) => {
              console.error('Error loading quiz:', err);
              this.error = 'Failed to load quiz. Please try again.';
            }
          });
        }
      },
      error: (err) => {
        console.error('Error checking quiz attempt:', err);
        this.error = 'Failed to check quiz attempt status. Please try again.';
      }
    });
  }

  initializeSelectedOptions(): void {
    if (this.quiz) {
      // Initialize selected options array with -1 (nothing selected)
      this.selectedOptionIndexes = Array(this.quiz.questions.length).fill(-1);
    }
  }

  get currentQuestion(): Question | null {
    return this.quiz && this.quiz.questions.length > this.currentQuestionIndex
      ? this.quiz.questions[this.currentQuestionIndex]
      : null;
  }

  selectOption(optionIndex: number): void {
    if (this.currentQuestion) {
      this.selectedOptionIndexes[this.currentQuestionIndex] = optionIndex;
    }
  }

  isOptionSelected(optionIndex: number): boolean {
    return this.selectedOptionIndexes[this.currentQuestionIndex] === optionIndex;
  }

  nextQuestion(): void {
    if (this.quiz && this.currentQuestionIndex < this.quiz.questions.length - 1) {
      this.currentQuestionIndex++;
    }
  }

  previousQuestion(): void {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
    }
  }

  isLastQuestion(): boolean {
    return this.quiz ? this.currentQuestionIndex === this.quiz.questions.length - 1 : false;
  }

  isFirstQuestion(): boolean {
    return this.currentQuestionIndex === 0;
  }

  isQuestionAnswered(): boolean {
    return this.selectedOptionIndexes[this.currentQuestionIndex] !== -1;
  }

  allQuestionsAnswered(): boolean {
    return this.selectedOptionIndexes.every(index => index !== -1);
  }

  submitQuiz(): void {
    if (!this.quiz || this.submitting) {
      return;
    }

    // Calculate score immediately
    let score = 0;
    const answers: QuizAnswer[] = [];

    this.quiz.questions.forEach((question, index) => {
      const selectedIndex = this.selectedOptionIndexes[index];
      const isCorrect = selectedIndex === question.correctOptionIndex;
      
      // Add to score if correct
      if (isCorrect) {
        score += question.grade;
      }

      // Record answer
      answers.push({
        questionId: question.id || `q${index}`,
        selectedOptionIndex: selectedIndex,
        isCorrect,
        grade: isCorrect ? question.grade : 0
      });
    });

    // Calculate percentage and display results immediately
    this.finalScore = score;
    this.scorePercentage = Math.round((score / this.totalGrade) * 100);
    this.quizCompleted = true;

    // Save attempt to database in the background
    const attempt: QuizAttempt = {
      userId: this.userId,
      quizId: this.quiz.id!,
      quizTitle: this.quiz.title,
      score,
      totalGrade: this.totalGrade,
      percentage: this.scorePercentage,
      category: this.quiz.category,
      completedAt: new Date().toISOString(),
      answers
    };

    // Mark as submitting to prevent double submission
    this.submitting = true;

    // Save and update local cache
    this.quizAttemptService.saveQuizAttempt(attempt).subscribe({
      next: () => {
        // Force cache update for quiz attempts
        this.quizAttemptService.getUserAttemptsImmediate().then(() => {
          console.log('Quiz attempt saved successfully');
        }).catch(err => {
          console.error('Error updating cache:', err);
        });
      },
      error: (err) => {
        console.error('Error saving quiz attempt:', err);
        // Just log the error but don't show to user since results are already displayed
      }
    });
  }

  returnToDashboard(): void {
    this.router.navigate(['/user/dashboard']);
  }

  viewAllQuizzes(): void {
    this.router.navigate(['/user/quizzes']);
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        // Redirect is handled by the auth service
      },
      error: (error: any) => {
        console.error('Logout error:', error);
      }
    });
  }
}
