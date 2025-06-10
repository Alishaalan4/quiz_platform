import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QuizService, Quiz } from '../../services/quiz.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-quizzes',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './quizzes.html',
  styleUrl: './quizzes.css'
})
export class Quizzes implements OnInit, OnDestroy {
  quizzes: Quiz[] = [];
  filteredQuizzes: Quiz[] = [];
  loading = false;
  error = '';
  success = '';
  searchTerm = '';
  private subscription: Subscription = new Subscription();
  
  constructor(
    private quizService: QuizService,
    private router: Router
  ) {
    // Load quizzes immediately in constructor
    this.loadQuizzes();
  }
  
  ngOnInit() {
    // Nothing needed here as we load in constructor
  }
  
  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
  
  loadQuizzes() {
    // Don't show loading state initially
    this.error = '';
    
    const sub = this.quizService.getQuizzes().subscribe({
      next: (quizzes) => {
        console.log('Quizzes component received quizzes:', quizzes.length);
        this.quizzes = quizzes;
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load quizzes';
        this.quizzes = [];
        this.filteredQuizzes = [];
        this.loading = false;
        console.error('Error loading quizzes:', err);
      }
    });
    
    this.subscription.add(sub);
  }
  
  applyFilter() {
    if (!this.searchTerm) {
      this.filteredQuizzes = [...this.quizzes];
      return;
    }
    
    const searchTermLower = this.searchTerm.toLowerCase();
    this.filteredQuizzes = this.quizzes.filter(quiz => 
      quiz.title.toLowerCase().includes(searchTermLower) || 
      quiz.description.toLowerCase().includes(searchTermLower) ||
      quiz.category.toLowerCase().includes(searchTermLower)
    );
  }
  
  deleteQuiz(id: string) {
    if (confirm('Are you sure you want to delete this quiz?')) {
      // Don't show loading state for delete
      const sub = this.quizService.deleteQuiz(id).subscribe({
        next: () => {
          this.success = 'Quiz deleted successfully';
          this.loadQuizzes();
        },
        error: (err) => {
          this.error = err.message || 'Failed to delete quiz';
          this.loading = false;
          console.error('Error deleting quiz:', err);
        }
      });
      
      this.subscription.add(sub);
    }
  }
  
  editQuiz(id: string) {
    this.router.navigate(['/admin/quizzes/edit', id]);
  }
  
  createQuiz() {
    this.router.navigate(['/admin/quizzes/create']);
  }
  
  getCategoryBadgeClass(category: string): string {
    switch (category) {
      case 'easy':
        return 'bg-success';
      case 'medium':
        return 'bg-warning';
      case 'hard':
        return 'bg-danger';
      default:
        return 'bg-primary';
    }
  }
  
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'bg-success';
      case 'pending':
        return 'bg-warning';
      default:
        return 'bg-secondary';
    }
  }
}
