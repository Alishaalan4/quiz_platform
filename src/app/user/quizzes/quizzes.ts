import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { QuizService, Quiz } from '../../services/quiz.service';
import { QuizAttemptService, QuizAttempt } from '../../services/quiz-attempt.service';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-quizzes',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './quizzes.html',
  styleUrl: './quizzes.css'
})
export class Quizzes implements OnInit {
  quizzes: Quiz[] = [];
  attemptedQuizzes: Quiz[] = [];
  unattemptedQuizzes: Quiz[] = [];
  quizScores: Map<string, number> = new Map(); // Map to store quiz scores by quiz ID
  loading = false;
  error = '';
  userName = 'User';

  constructor(
    private quizService: QuizService,
    private quizAttemptService: QuizAttemptService,
    private authService: Auth
  ) {
    // Get user name if available
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      if (currentUser.displayName) {
        this.userName = currentUser.displayName;
      } else {
        // If no display name, try to get from Firestore via subscription
        this.authService.currentUser$.subscribe(user => {
          if (user && user.displayName) {
            this.userName = user.displayName;
          }
        });
      }
    }

    // Load quizzes immediately in constructor for faster display
    this.loadQuizzesImmediate();
  }

  ngOnInit(): void {
    // No need to load quizzes here as we're doing it in constructor
  }

  // Load quizzes immediately without waiting for subscriptions
  async loadQuizzesImmediate(): Promise<void> {
    try {
      // Get quizzes directly using Promise
      const quizzes = await this.quizService.getQuizzesImmediate();
      this.quizzes = quizzes;
      
      // Get user attempts directly using Promise
      const attempts = await this.quizAttemptService.getUserAttemptsImmediate();
      
      // Store quiz scores in the map
      attempts.forEach((attempt: QuizAttempt) => {
        this.quizScores.set(attempt.quizId, attempt.percentage);
      });
      
      // Process data immediately
      const attemptedQuizIds = attempts.map((a: QuizAttempt) => a.quizId);
      this.attemptedQuizzes = quizzes.filter((quiz: Quiz) => attemptedQuizIds.includes(quiz.id!));
      this.unattemptedQuizzes = quizzes.filter((quiz: Quiz) => !attemptedQuizIds.includes(quiz.id!));
    } catch (err) {
      console.error('Error loading data:', err);
      this.error = 'Failed to load quiz data. Please refresh the page.';
    }
  }

  // Original method kept for backward compatibility
  loadQuizzes(): void {
    this.quizService.getQuizzes().subscribe({
      next: (quizzes) => {
        this.quizzes = quizzes;
        
        // Manually categorize quizzes instead of using the query that requires an index
        this.quizAttemptService.getUserAttempts().subscribe({
          next: (attempts) => {
            const attemptedQuizIds = attempts.map(a => a.quizId);
            this.attemptedQuizzes = quizzes.filter(quiz => attemptedQuizIds.includes(quiz.id!));
            this.unattemptedQuizzes = quizzes.filter(quiz => !attemptedQuizIds.includes(quiz.id!));
          },
          error: (err) => {
            console.error('Error getting user attempts:', err);
            this.error = 'Failed to load quiz attempt status. Please refresh the page.';
          }
        });
      },
      error: (err) => {
        console.error('Error loading quizzes:', err);
        this.error = 'Failed to load quizzes. Please refresh the page.';
      }
    });
  }

  getDifficultyClass(category: string): string {
    switch (category) {
      case 'easy': return 'quiz-difficulty-easy';
      case 'medium': return 'quiz-difficulty-medium';
      case 'hard': return 'quiz-difficulty-hard';
      default: return '';
    }
  }

  // Get user's score for a specific quiz
  getQuizScore(quizId: string): number {
    return this.quizScores.get(quizId) || 0;
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
