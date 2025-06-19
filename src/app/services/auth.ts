import { Injectable } from '@angular/core';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, Auth as FirebaseAuth, UserCredential, updateProfile, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Firestore, getDoc } from 'firebase/firestore';
import { BehaviorSubject, Observable, from, throwError, of } from 'rxjs';
import { switchMap, catchError, tap, timeout, map } from 'rxjs/operators';

const firebaseConfig = {
  apiKey: "AIzaSyBrNBT8RVNeOvcl575ZEDZjcXzXATuYDsQ",
  authDomain: "quiz-platform-6c415.firebaseapp.com",
  projectId: "quiz-platform-6c415",
  storageBucket: "quiz-platform-6c415.appspot.com",
  messagingSenderId: "639261071964",
  appId: "1:639261071964:web:f61baf944bbd3099bb6499",
  measurementId: "G-HF526SVGT1"
};

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private auth!: FirebaseAuth;
  private db!: Firestore;
  private app: any;
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private firestoreEnabled = true;
  private userRole: string | null = null;
  private roleSubject = new BehaviorSubject<string | null>(null);
  public userRole$ = this.roleSubject.asObservable();

  constructor() {
    try {
      // Initialize Firebase
      this.app = initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);
      
      try {
        this.db = getFirestore(this.app);
      } catch (dbError) {
        console.error('Error initializing Firestore:', dbError);
        this.firestoreEnabled = false;
      }
      
      // Set persistence to local
      setPersistence(this.auth, browserLocalPersistence)
        .then(() => {
          console.log('Persistence set to local');
        })
        .catch((error) => {
          console.error('Error setting persistence:', error);
        });
      
      // Set up auth state listener
      this.auth.onAuthStateChanged(user => {
        console.log('Auth state changed:', user);
        this.currentUserSubject.next(user);
        
        // Check user role when auth state changes
        if (user) {
          this.checkUserRole(user.uid);
        } else {
          this.userRole = null;
          this.roleSubject.next(null);
        }
      });
      
      // Check if user is already logged in
      const currentUser = this.auth.currentUser;
      if (currentUser) {
        console.log('User already logged in:', currentUser);
        this.checkUserRole(currentUser.uid);
      }
    } catch (error) {
      console.error('Error initializing Firebase:', error);
    }
  }
  
  // Check user role from Firestore
  private checkUserRole(uid: string): void {
    if (!this.firestoreEnabled || !this.db) {
      console.warn('Firestore is not enabled, cannot check user role');
      return;
    }
    
    console.log('Checking user role for UID:', uid);
    const userRef = doc(this.db, 'users', uid);
    getDoc(userRef).then(docSnapshot => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        this.userRole = userData['role'] || null;
        this.roleSubject.next(this.userRole);
        console.log('User role set to:', this.userRole);
      } else {
        console.warn('User document not found in Firestore');
        this.userRole = null;
        this.roleSubject.next(null);
      }
    }).catch(error => {
      console.error('Error fetching user role:', error);
      this.userRole = null;
      this.roleSubject.next(null);
    });
  }

  // Register new admin user
  registerAdmin(name: string, email: string, password: string): Observable<UserCredential> {
    console.log('Registering with:', { email, password, name });
    
    return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(userCredential => {
        console.log('User registered successfully:', userCredential);
        
        // Update profile with name
        return from(updateProfile(userCredential.user, { displayName: name })).pipe(
          switchMap(() => {
            // Only try to save to Firestore if it's enabled
            if (!this.firestoreEnabled) {
              console.log('Firestore is disabled - skipping user data save');
              return of(userCredential);
            }
            
            const userData = {
              uid: userCredential.user.uid,
              email: email,
              name: name,
              role: 'admin',
              createdAt: new Date().toISOString()
            };
            
            // Try to save to Firestore with a timeout
            return from(setDoc(doc(this.db, 'users', userCredential.user.uid), userData)).pipe(
              timeout(5000), // 5 second timeout for Firestore operations
              tap(() => {
                console.log('User data saved to Firestore');
                this.userRole = 'admin';
                this.roleSubject.next('admin');
              }),
              catchError(firestoreError => {
                // Log the error but continue with registration
                console.error('Failed to save user data to Firestore:', firestoreError);
                return of(null);
              }),
              // Return the original user credential regardless of Firestore results
              switchMap(() => of(userCredential))
            );
          })
        );
      }),
      catchError(error => {
        console.error('Registration error:', error);
        return throwError(() => new Error(this.getErrorMessage(error.code)));
      })
    );
  }

  // Login with email and password
  login(email: string, password: string): Observable<UserCredential> {
    console.log('Logging in with:', { email, password: '********' });
    
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(userCredential => {
        // Check user in Firestore after successful Firebase Auth login
        if (this.firestoreEnabled) {
          const uid = userCredential.user.uid;
          const userRef = doc(this.db, 'users', uid);
          
          return from(getDoc(userRef)).pipe(
            map(docSnapshot => {
              if (docSnapshot.exists()) {
                const userData = docSnapshot.data();
                this.userRole = userData['role'] || null;
                this.roleSubject.next(this.userRole);
                console.log('User data from Firestore:', userData);
                console.log('User role set to:', this.userRole);
                return userCredential;
              } else {
                console.warn('User document not found in Firestore');
                this.userRole = null;
                this.roleSubject.next(null);
                return userCredential;
              }
            }),
            catchError(error => {
              console.error('Error fetching user data:', error);
              this.userRole = null;
              this.roleSubject.next(null);
              return of(userCredential);
            })
          );
        } else {
          return of(userCredential);
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => new Error(this.getErrorMessage(error.code)));
      })
    );
  }

  // Logout
  logout(): Observable<void> {
    return from(signOut(this.auth)).pipe(
      tap(() => {
        this.userRole = null;
        this.roleSubject.next(null);
        console.log('User logged out, role cleared');
      }),
      catchError(error => {
        console.error('Logout error:', error);
        // Return a success result even if logout fails to ensure application flow continues
        return of(void 0);
      })
    );
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  // Get current user
  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }
  
  // Get user role
  getUserRole(): string | null {
    console.log('Getting user role:', this.userRole);
    return this.userRole;
  }

  // Helper function to get readable error messages
  private getErrorMessage(errorCode: string): string {
    console.log('Error code:', errorCode);
    switch(errorCode) {
      case 'auth/email-already-in-use':
        return 'This email is already in use';
      case 'auth/invalid-email':
        return 'Invalid email format';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/user-not-found':
        return 'User not found';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/network-request-failed':
        return 'Network error - check your internet connection';
      case 'auth/too-many-requests':
        return 'Too many failed attempts - try again later';
      case 'auth/internal-error':
        return 'An internal authentication error occurred';
      default:
        return `Authentication error: ${errorCode || 'Unknown error'}`;
    }
  }
}
