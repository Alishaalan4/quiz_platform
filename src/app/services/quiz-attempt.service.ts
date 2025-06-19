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
  where, 
  getDocs,
  orderBy,
  limit
} from '@angular/fire/firestore';
import { Auth as FirebaseAuth } from '@angular/fire/auth';
import { Quiz } from './quiz.service';

export interface QuizAttempt {
  id?: string;
  userId: string;
  quizId: string;
  quizTitle: string;
  score: number;
  totalGrade: number;
  percentage: number;
  category: string;
  completedAt: string;
  answers: QuizAnswer[];
}

export interface QuizAnswer {
  questionId: string;
  selectedOptionIndex: number;
  isCorrect: boolean;
  grade: number;
}

@Injectable({
  providedIn: 'root'
})
export class QuizAttemptService {
  private userAttempts: QuizAttempt[] = [];
  private attemptsLoaded = false;

  constructor(
    private firestore: Firestore,
    private auth: FirebaseAuth
  ) {
    // Preload user attempts if user is logged in
    if (this.auth.currentUser) {
      this.preloadUserAttempts();
    }
  }

  // Preload user attempts
  private preloadUserAttempts(): void {
    try {
      this.getUserAttemptsImmediate().then(attempts => {
        this.userAttempts = attempts;
        this.attemptsLoaded = true;
        console.log('User attempts preloaded:', attempts.length);
      }).catch(error => {
        console.error('Error preloading user attempts:', error);
      });
    } catch (error) {
      console.error('Error in preloadUserAttempts:', error);
    }
  }

  // Get current user ID
  private getCurrentUserId(): string {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user.uid;
  }

  // Save a quiz attempt
  saveQuizAttempt(attempt: QuizAttempt): Observable<string> {
    try {
      // Make sure we have the current user ID
      if (!attempt.userId) {
        attempt.userId = this.getCurrentUserId();
      }
      
      // Add timestamp if not provided
      if (!attempt.completedAt) {
        attempt.completedAt = new Date().toISOString();
      }
      
      // Calculate percentage if not provided
      if (!attempt.percentage && attempt.score !== undefined && attempt.totalGrade) {
        attempt.percentage = Math.round((attempt.score / attempt.totalGrade) * 100);
      }
      
      const attemptsRef = collection(this.firestore, 'quiz_attempts');
      return from(addDoc(attemptsRef, attempt)).pipe(
        map(docRef => {
          // Add to cache with the new ID
          const newAttempt = { ...attempt, id: docRef.id };
          this.userAttempts = [...this.userAttempts, newAttempt];
          this.attemptsLoaded = true;
          console.log('Quiz attempt added to cache:', docRef.id);
          return docRef.id;
        })
      );
    } catch (error) {
      console.error('Error saving quiz attempt:', error);
      return throwError(() => new Error('Failed to save quiz attempt. Please try again later.'));
    }
  }

  // Get all attempts for the current user
  getUserAttempts(): Observable<QuizAttempt[]> {
    try {
      // Return cached attempts if available
      if (this.attemptsLoaded && this.userAttempts.length > 0) {
        console.log('Returning cached user attempts (Observable):', this.userAttempts.length);
        return of(this.userAttempts);
      }

      const userId = this.getCurrentUserId();
      const attemptsRef = collection(this.firestore, 'quiz_attempts');
      
      // Simple query that doesn't require a composite index
      const userAttemptsQuery = query(
        attemptsRef,
        where('userId', '==', userId)
      );
      
      return collectionData(userAttemptsQuery, { idField: 'id' }).pipe(
        map(attempts => {
          const typedAttempts = attempts as QuizAttempt[];
          // Update cache
          this.userAttempts = typedAttempts;
          this.attemptsLoaded = true;
          return typedAttempts;
        })
      );
    } catch (error) {
      console.error('Error getting user attempts:', error);
      return throwError(() => new Error('Failed to load quiz attempts. Please try again later.'));
    }
  }

  // Get all attempts for the current user immediately as a Promise
  async getUserAttemptsImmediate(): Promise<QuizAttempt[]> {
    try {
      // Return cached attempts if available
      if (this.attemptsLoaded && this.userAttempts.length > 0) {
        console.log('Returning cached user attempts:', this.userAttempts.length);
        return this.userAttempts;
      }

      const userId = this.getCurrentUserId();
      const attemptsRef = collection(this.firestore, 'quiz_attempts');
      
      // Simple query that doesn't require a composite index
      const userAttemptsQuery = query(
        attemptsRef,
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(userAttemptsQuery);
      
      const attempts: QuizAttempt[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        attempts.push({ ...data, id: doc.id } as QuizAttempt);
      });
      
      // Update cache
      this.userAttempts = attempts;
      this.attemptsLoaded = true;
      
      return attempts;
    } catch (error) {
      console.error('Error getting user attempts immediately:', error);
      throw new Error('Failed to load quiz attempts. Please try again later.');
    }
  }

  // Get a specific attempt by ID
  getAttempt(id: string): Observable<QuizAttempt | undefined> {
    try {
      const attemptRef = doc(this.firestore, `quiz_attempts/${id}`);
      return docData(attemptRef, { idField: 'id' }).pipe(
        map(attempt => attempt as QuizAttempt)
      );
    } catch (error) {
      console.error('Error getting attempt:', error);
      return throwError(() => new Error('Failed to load quiz attempt. Please try again later.'));
    }
  }

  // Check if user has attempted a specific quiz
  hasAttemptedQuiz(quizId: string): Observable<boolean> {
    try {
      const userId = this.getCurrentUserId();
      const attemptsRef = collection(this.firestore, 'quiz_attempts');
      const attemptQuery = query(
        attemptsRef,
        where('userId', '==', userId),
        where('quizId', '==', quizId),
        limit(1)
      );
      
      return from(getDocs(attemptQuery)).pipe(
        map(snapshot => !snapshot.empty)
      );
    } catch (error) {
      console.error('Error checking quiz attempt:', error);
      return throwError(() => new Error('Failed to check quiz attempt. Please try again later.'));
    }
  }

  // Get user's highest score
  getHighestScore(): Observable<number> {
    return this.getUserAttempts().pipe(
      map(attempts => {
        if (attempts.length === 0) return 0;
        const scores = attempts.map(a => a.percentage || 0);
        return Math.max(...scores);
      })
    );
  }

  // Get user's average score
  getAverageScore(): Observable<number> {
    return this.getUserAttempts().pipe(
      map(attempts => {
        if (attempts.length === 0) return 0;
        const sum = attempts.reduce((total, attempt) => total + (attempt.percentage || 0), 0);
        return Math.round(sum / attempts.length);
      })
    );
  }

  // Get attempted and unattempted quizzes
  getQuizAttemptStatus(quizzes: Quiz[]): Observable<{
    attempted: Quiz[];
    unattempted: Quiz[];
  }> {
    return this.getUserAttempts().pipe(
      map(attempts => {
        const attemptedQuizIds = attempts.map(a => a.quizId);
        const attempted = quizzes.filter(quiz => attemptedQuizIds.includes(quiz.id!));
        const unattempted = quizzes.filter(quiz => !attemptedQuizIds.includes(quiz.id!));
        
        return { attempted, unattempted };
      })
    );
  }
} 