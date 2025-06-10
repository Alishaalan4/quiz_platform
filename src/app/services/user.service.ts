import { Injectable } from '@angular/core';
import { Observable, of, from, map, catchError, tap, switchMap, throwError } from 'rxjs';
import { 
  Firestore, 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  collectionData, 
  docData,
  setDoc,
  getDocs
} from '@angular/fire/firestore';
import { Auth as FirebaseAuth, createUserWithEmailAndPassword, onAuthStateChanged, User as FirebaseUser } from '@angular/fire/auth';

export interface User {
  id?: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: any;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private currentUser: FirebaseUser | null = null;
  private users: User[] = [];

  constructor(
    private firestore: Firestore,
    private auth: FirebaseAuth
  ) {
    // Listen for auth state changes
    onAuthStateChanged(this.auth, (user) => {
      console.log('Auth state changed:', user);
      this.currentUser = user;
    });
    
    // Load users initially
    this.loadUsers();
  }
  
  // Load users into cache
  private loadUsers() {
    try {
      const usersRef = collection(this.firestore, 'users');
      collectionData(usersRef, { idField: 'id' }).subscribe(users => {
        this.users = users as User[];
        console.log('Users loaded into cache:', this.users.length);
      });
    } catch (error) {
      console.error('Error loading users into cache:', error);
    }
  }

  // Get all users
  getUsers(): Observable<User[]> {
    try {
      // Return cached users if available
      if (this.users.length > 0) {
        console.log('Returning cached users:', this.users.length);
        return of(this.users);
      }
      
      const usersRef = collection(this.firestore, 'users');
      return collectionData(usersRef, { idField: 'id' }).pipe(
        map(users => {
          this.users = users as User[];
          console.log('Users fetched from Firestore:', this.users.length);
          return this.users;
        }),
        catchError(error => {
          console.error('Error getting users:', error);
          return throwError(() => new Error('Failed to load users. Please try again later.'));
        })
      );
    } catch (error) {
      console.error('Error getting users:', error);
      return throwError(() => new Error('Failed to load users. Please try again later.'));
    }
  }

  // Get a single user by ID
  getUser(id: string): Observable<User | undefined> {
    try {
      // Check cache first
      const cachedUser = this.users.find(user => user.id === id);
      if (cachedUser) {
        console.log('Returning cached user:', id);
        return of(cachedUser);
      }
      
      const userRef = doc(this.firestore, `users/${id}`);
      return docData(userRef, { idField: 'id' }).pipe(
        map(user => user as User),
        catchError(error => {
          console.error('Error getting user:', error);
          return throwError(() => new Error('Failed to load user. Please try again later.'));
        })
      );
    } catch (error) {
      console.error('Error getting user:', error);
      return throwError(() => new Error('Failed to load user. Please try again later.'));
    }
  }

  // Create a new user
  createUser(userData: any): Observable<string> {
    // If password is provided, create auth user first
    if (userData.password) {
      return from(createUserWithEmailAndPassword(this.auth, userData.email, userData.password)).pipe(
        tap(credential => console.log('User created in Firebase Auth:', credential.user)),
        switchMap(credential => {
          const uid = credential.user.uid;
          
          // Remove password before storing in Firestore
          const { password, confirmPassword, ...userDataWithoutPassword } = userData;
          
          // Prepare user data with timestamp
          const firestoreData = {
            ...userDataWithoutPassword,
            uid: uid,
            createdAt: new Date().toISOString()
          };
          
          console.log('Saving user data to Firestore:', firestoreData);
          
          // Use the UID from Firebase Auth as the document ID
          const userDocRef = doc(this.firestore, 'users', uid);
          
          // Store user data with setDoc instead of addDoc
          return from(setDoc(userDocRef, firestoreData)).pipe(
            map(() => {
              // Update cache
              this.loadUsers();
              return uid;
            }),
            catchError(err => {
              console.error('Error saving user data to Firestore:', err);
              return throwError(() => new Error('Failed to save user data. Please try again later.'));
            })
          );
        }),
        catchError(error => {
          console.error('Error creating user with Firebase Auth:', error);
          return throwError(() => new Error('Failed to create user. ' + this.getFirebaseErrorMessage(error)));
        })
      );
    } else {
      // No password provided, just add to Firestore
      try {
        const usersRef = collection(this.firestore, 'users');
        const userDataToSave = {
          ...userData,
          createdAt: new Date().toISOString()
        };
        
        return from(addDoc(usersRef, userDataToSave)).pipe(
          map(docRef => {
            // Update cache
            this.loadUsers();
            return docRef.id;
          }),
          catchError(error => {
            console.error('Error creating user in Firestore:', error);
            return throwError(() => new Error('Failed to create user. Please try again later.'));
          })
        );
      } catch (error) {
        console.error('Error creating user:', error);
        return throwError(() => new Error('Failed to create user. Please try again later.'));
      }
    }
  }

  // Update an existing user
  updateUser(id: string, userData: Partial<User>): Observable<void> {
    try {
      const userRef = doc(this.firestore, `users/${id}`);
      return from(updateDoc(userRef, userData)).pipe(
        tap(() => {
          // Update cache
          this.loadUsers();
        }),
        catchError(error => {
          console.error('Error updating user:', error);
          return throwError(() => new Error('Failed to update user. Please try again later.'));
        })
      );
    } catch (error) {
      console.error('Error updating user:', error);
      return throwError(() => new Error('Failed to update user. Please try again later.'));
    }
  }

  // Delete a user
  deleteUser(id: string): Observable<void> {
    try {
      const userRef = doc(this.firestore, `users/${id}`);
      return from(deleteDoc(userRef)).pipe(
        tap(() => {
          // Update cache
          this.loadUsers();
        }),
        catchError(error => {
          console.error('Error deleting user:', error);
          return throwError(() => new Error('Failed to delete user. Please try again later.'));
        })
      );
    } catch (error) {
      console.error('Error deleting user:', error);
      return throwError(() => new Error('Failed to delete user. Please try again later.'));
    }
  }

  // Get user count
  getUserCount(): Observable<number> {
    // Return cached count if available
    if (this.users.length > 0) {
      console.log('Returning cached user count:', this.users.length);
      return of(this.users.length);
    }
    
    return this.getUsers().pipe(
      map(users => {
        console.log('User count from Firestore:', users.length);
        return users.length;
      })
    );
  }

  // Helper to extract meaningful error messages from Firebase errors
  private getFirebaseErrorMessage(error: any): string {
    if (!error || !error.code) return 'Unknown error occurred';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        return 'Email is already in use. Please use a different email.';
      case 'auth/invalid-email':
        return 'Invalid email format.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use a stronger password.';
      case 'auth/operation-not-allowed':
        return 'Email/password accounts are not enabled. Please contact support.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again.';
      default:
        return error.message || 'An error occurred during authentication.';
    }
  }
} 