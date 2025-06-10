import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { Observable, forkJoin, of, catchError, Subscription } from 'rxjs';
import { QuizService, Quiz } from '../../services/quiz.service';
import { UserService, User } from '../../services/user.service';

interface DashboardStats {
  totalQuizzes: number;
  totalUsers: number;
  completedQuizzes: number;
  pendingQuizzes: number;
  easyQuizzes: number;
  mediumQuizzes: number;
  hardQuizzes: number;
  error?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, OnDestroy {
  loading = false;
  currentUser: any = null;
  stats: DashboardStats = {
    totalQuizzes: 0,
    totalUsers: 0,
    completedQuizzes: 0,
    pendingQuizzes: 0,
    easyQuizzes: 0,
    mediumQuizzes: 0,
    hardQuizzes: 0
  };
  Math = Math; // Make Math available in the template
  private subscriptions = new Subscription();
  
  constructor(
    private authService: Auth,
    private router: Router,
    private quizService: QuizService,
    private userService: UserService
  ) {
    // Load data immediately in constructor
    this.loadDashboardStats();
  }
  
  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    
    // Force load users separately to ensure we get the count
    this.userService.getUsers().subscribe(users => {
      console.log('Dashboard loaded users:', users.length);
      this.stats.totalUsers = users.length;
    });
  }
  
  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
  
  loadDashboardStats() {
    // Use forkJoin to load both quizzes stats and user count in parallel
    const sub = forkJoin({
      quizStats: this.quizService.getQuizStatistics().pipe(
        catchError(error => {
          console.error('Error loading quiz statistics:', error);
          this.stats.error = 'Failed to load quiz data';
          return of({
            total: 0,
            completed: 0,
            pending: 0,
            easy: 0,
            medium: 0,
            hard: 0
          });
        })
      ),
      userCount: this.userService.getUserCount().pipe(
        catchError(error => {
          console.error('Error loading user count:', error);
          this.stats.error = 'Failed to load user data';
          return of(0);
        })
      )
    }).subscribe({
      next: results => {
        // Update quiz statistics
        this.stats.totalQuizzes = results.quizStats.total;
        this.stats.completedQuizzes = results.quizStats.completed;
        this.stats.pendingQuizzes = results.quizStats.pending;
        this.stats.easyQuizzes = results.quizStats.easy;
        this.stats.mediumQuizzes = results.quizStats.medium;
        this.stats.hardQuizzes = results.quizStats.hard;
        
        console.log('Quiz stats loaded:', results.quizStats);
        
        // Update user count
        console.log('User count from forkJoin:', results.userCount);
        this.stats.totalUsers = results.userCount;
        this.loading = false;
      },
      error: err => {
        console.error('Error loading dashboard stats:', err);
        this.stats.error = 'Failed to load dashboard data. Please try again later.';
        this.loading = false;
      }
    });
    
    this.subscriptions.add(sub);
  }
  
  logout() {
    const sub = this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/admin/login']);
      },
      error: (error) => {
        console.error('Logout error:', error);
      }
    });
    
    this.subscriptions.add(sub);
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }
}
