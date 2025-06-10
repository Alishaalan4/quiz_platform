import { Injectable } from '@angular/core';
import { Observable, from, map, throwError, of, tap } from 'rxjs';
import { 
  Firestore, 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  collectionData, 
  docData, 
  query, 
  where 
} from '@angular/fire/firestore';

export interface Quiz {
  id?: string;
  title: string;
  description: string;
  category: 'easy' | 'medium' | 'hard';
  totalGrade: number;
  status: 'pending' | 'completed';
  createdAt: any;
  questions: Question[];
}

export interface Question {
  id?: string;
  text: string;
  grade: number;
  options: Option[];
  correctOptionIndex: number;
}

export interface Option {
  text: string;
}

@Injectable({
  providedIn: 'root'
})
export class QuizService {
  private quizzes: Quiz[] = [];
  private quizzesLoaded = false;

  constructor(private firestore: Firestore) {
    // Load quizzes initially
    this.loadQuizzes();
  }

  // Load quizzes into cache
  private loadQuizzes() {
    try {
      const quizzesRef = collection(this.firestore, 'quizzes');
      collectionData(quizzesRef, { idField: 'id' }).subscribe(quizzes => {
        this.quizzes = quizzes as Quiz[];
        this.quizzesLoaded = true;
        console.log('Quizzes loaded into cache:', this.quizzes.length);
      });
    } catch (error) {
      console.error('Error loading quizzes into cache:', error);
    }
  }

  // Get all quizzes
  getQuizzes(): Observable<Quiz[]> {
    try {
      // Return cached quizzes if available
      if (this.quizzesLoaded && this.quizzes.length > 0) {
        console.log('Returning cached quizzes:', this.quizzes.length);
        return of(this.quizzes);
      }
      
      const quizzesRef = collection(this.firestore, 'quizzes');
      return collectionData(quizzesRef, { idField: 'id' }).pipe(
        map(quizzes => quizzes as Quiz[]),
        tap(quizzes => {
          this.quizzes = quizzes;
          this.quizzesLoaded = true;
          console.log('Loaded quizzes from Firestore:', quizzes.length);
        })
      );
    } catch (error) {
      console.error('Error getting quizzes:', error);
      return throwError(() => new Error('Failed to load quizzes. Please try again later.'));
    }
  }

  // Get a single quiz by ID
  getQuiz(id: string): Observable<Quiz | undefined> {
    try {
      // Check cache first
      const cachedQuiz = this.quizzes.find(quiz => quiz.id === id);
      if (cachedQuiz) {
        console.log('Returning cached quiz:', id);
        return of(cachedQuiz);
      }
      
      const quizRef = doc(this.firestore, `quizzes/${id}`);
      return docData(quizRef, { idField: 'id' }).pipe(
        map(quiz => quiz as Quiz),
        tap(quiz => {
          // Update cache with this quiz
          const index = this.quizzes.findIndex(q => q.id === id);
          if (index >= 0) {
            this.quizzes[index] = quiz;
          } else {
            this.quizzes.push(quiz);
          }
        })
      );
    } catch (error) {
      console.error('Error getting quiz:', error);
      return throwError(() => new Error('Failed to load quiz. Please try again later.'));
    }
  }

  // Create a new quiz
  createQuiz(quiz: Quiz): Observable<string> {
    try {
      const quizzesRef = collection(this.firestore, 'quizzes');
      // Add timestamp if not provided
      if (!quiz.createdAt) {
        quiz.createdAt = new Date().toISOString();
      }
      
      return from(addDoc(quizzesRef, quiz)).pipe(
        map(docRef => {
          // Add to cache with the new ID
          const newQuiz = { ...quiz, id: docRef.id };
          this.quizzes.push(newQuiz);
          console.log('Quiz created and added to cache:', docRef.id);
          return docRef.id;
        })
      );
    } catch (error) {
      console.error('Error creating quiz:', error);
      return throwError(() => new Error('Failed to create quiz. Please try again later.'));
    }
  }

  // Update an existing quiz
  updateQuiz(id: string, quiz: Partial<Quiz>): Observable<void> {
    try {
      const quizRef = doc(this.firestore, `quizzes/${id}`);
      return from(updateDoc(quizRef, quiz)).pipe(
        tap(() => {
          // Update cache
          const index = this.quizzes.findIndex(q => q.id === id);
          if (index >= 0) {
            this.quizzes[index] = { ...this.quizzes[index], ...quiz };
            console.log('Quiz updated in cache:', id);
          }
        })
      );
    } catch (error) {
      console.error('Error updating quiz:', error);
      return throwError(() => new Error('Failed to update quiz. Please try again later.'));
    }
  }

  // Delete a quiz
  deleteQuiz(id: string): Observable<void> {
    try {
      const quizRef = doc(this.firestore, `quizzes/${id}`);
      return from(deleteDoc(quizRef)).pipe(
        tap(() => {
          // Remove from cache
          this.quizzes = this.quizzes.filter(q => q.id !== id);
          console.log('Quiz removed from cache:', id);
        })
      );
    } catch (error) {
      console.error('Error deleting quiz:', error);
      return throwError(() => new Error('Failed to delete quiz. Please try again later.'));
    }
  }
  
  // Get quiz statistics
  getQuizStatistics() {
    if (this.quizzesLoaded) {
      return of(this.calculateStatistics(this.quizzes));
    }
    
    return this.getQuizzes().pipe(
      map(quizzes => this.calculateStatistics(quizzes))
    );
  }
  
  private calculateStatistics(quizzes: Quiz[]) {
    return {
      total: quizzes.length,
      completed: quizzes.filter(q => q.status === 'completed').length,
      pending: quizzes.filter(q => q.status === 'pending').length,
      easy: quizzes.filter(q => q.category === 'easy').length,
      medium: quizzes.filter(q => q.category === 'medium').length,
      hard: quizzes.filter(q => q.category === 'hard').length
    };
  }
} 