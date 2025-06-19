import { Component, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../services/auth';
import { 
  getFirestore, collection, getDocs, query, where, limit, 
  Firestore, DocumentData, getDoc, doc, onSnapshot
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyBrNBT8RVNeOvcl575ZEDZjcXzXATuYDsQ",
  authDomain: "quiz-platform-6c415.firebaseapp.com",
  projectId: "quiz-platform-6c415",
  storageBucket: "quiz-platform-6c415.appspot.com",
  messagingSenderId: "639261071964",
  appId: "1:639261071964:web:f61baf944bbd3099bb6499",
  measurementId: "G-HF526SVGT1"
};

// Initialize Firebase at module level for better performance
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  userName: string = 'User'; // Default name
  
  // Statistics properties with default values for immediate display
  availableExams: number = 0;
  examsTaken: number = 0;
  untakenExams: number = 0;
  highestGrade: number = 0;
  quizzesAttempted: number = 0;
  averageScore: number = 0;
  
  private userId: string = '';
  private quizzesUnsubscribe: any;
  private attemptsUnsubscribe: any;
  private userUnsubscribe: any;

  constructor(
    private authService: Auth,
    private router: Router,
    private ngZone: NgZone
  ) {
    // Get current user details immediately
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.userId = currentUser.uid;
      
      // Set temporary name from auth if available for immediate display
      if (currentUser.displayName) {
        this.userName = currentUser.displayName;
      }
      
      // Immediately fetch user data
      this.fetchUserDataImmediate();
      
      // Use immediate methods for faster loading
      this.fetchQuizzesDataImmediate();
      this.fetchAttemptsDataImmediate();
      
      // Also set up real-time listeners for future updates
      this.setupUserListener();
      this.setupRealTimeData();
    } else {
      // Redirect to login if no user found
      this.router.navigate(['/user/login']);
    }
  }

  ngOnInit() {
    // Component already initialized in constructor
  }
  
  ngOnDestroy() {
    // Clean up all listeners
    if (this.quizzesUnsubscribe) {
      this.quizzesUnsubscribe();
    }
    if (this.attemptsUnsubscribe) {
      this.attemptsUnsubscribe();
    }
    if (this.userUnsubscribe) {
      this.userUnsubscribe();
    }
  }
  
  // Immediately fetch user data
  private async fetchUserDataImmediate() {
    try {
      const userDocRef = doc(db, 'users', this.userId);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData && userData['name']) {
          this.ngZone.run(() => {
            this.userName = userData['name'];
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }
  
  // Immediately fetch quizzes data
  private async fetchQuizzesDataImmediate() {
    try {
      const quizzesQuery = query(collection(db, 'quizzes'));
      const quizzesSnapshot = await getDocs(quizzesQuery);
      
      this.ngZone.run(() => {
        this.availableExams = quizzesSnapshot.size;
        this.updateUntakenExams();
      });
    } catch (error) {
      console.error('Error fetching quizzes data:', error);
    }
  }
  
  // Immediately fetch attempts data
  private async fetchAttemptsDataImmediate() {
    try {
      const attemptsQuery = query(
        collection(db, 'quiz_attempts'),
        where('userId', '==', this.userId)
      );
      const attemptsSnapshot = await getDocs(attemptsQuery);
      
      const attempts: DocumentData[] = [];
      attemptsSnapshot.forEach(doc => {
        attempts.push(doc.data());
      });
      
      this.ngZone.run(() => {
        // Update statistics
        this.examsTaken = attempts.length;
        this.quizzesAttempted = attempts.length;
        this.updateUntakenExams();
        
        // Calculate scores
        if (attempts.length > 0) {
          const percentages = attempts.map(attempt => attempt['percentage'] || 0);
          this.highestGrade = Math.max(...percentages);
          this.averageScore = Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length);
        }
      });
    } catch (error) {
      console.error('Error fetching attempts data:', error);
    }
  }
  
  // Set up real-time listener for user data
  private setupUserListener() {
    // Get user document with real-time updates
    const userDocRef = doc(db, 'users', this.userId);
    
    // Listen for changes to user document
    this.userUnsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const userData = docSnapshot.data();
        
        // Check if 'name' field exists in the document
        if (userData && userData['name']) {
          this.ngZone.run(() => {
            this.userName = userData['name'];
          });
        }
      }
    }, error => {
      console.error('Error getting user document:', error);
    });
  }
  
  // Setup real-time data using onSnapshot
  private setupRealTimeData() {
    // Get quizzes in real-time
    const quizzesQuery = query(collection(db, 'quizzes'));
    this.quizzesUnsubscribe = onSnapshot(quizzesQuery, (snapshot) => {
      this.ngZone.run(() => {
        this.availableExams = snapshot.size;
        this.updateUntakenExams();
      });
    }, error => {
      console.error('Error getting quizzes:', error);
    });
    
    // Get user attempts in real-time
    const attemptsQuery = query(
      collection(db, 'quiz_attempts'),
      where('userId', '==', this.userId)
    );
    
    this.attemptsUnsubscribe = onSnapshot(attemptsQuery, (snapshot) => {
      const attempts: DocumentData[] = [];
      snapshot.forEach(doc => {
        attempts.push(doc.data());
      });
      
      this.ngZone.run(() => {
        // Update statistics
        this.examsTaken = attempts.length;
        this.quizzesAttempted = attempts.length;
        this.updateUntakenExams();
        
        // Calculate scores
        if (attempts.length > 0) {
          const percentages = attempts.map(attempt => attempt['percentage'] || 0);
          this.highestGrade = Math.max(...percentages);
          this.averageScore = Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length);
        }
      });
    }, error => {
      console.error('Error getting attempts:', error);
    });
  }
  
  // Update untaken exams calculation
  private updateUntakenExams() {
    this.untakenExams = Math.max(0, this.availableExams - this.examsTaken);
  }

  logout() {
    // Clean up listeners before logout
    if (this.quizzesUnsubscribe) {
      this.quizzesUnsubscribe();
    }
    if (this.attemptsUnsubscribe) {
      this.attemptsUnsubscribe();
    }
    if (this.userUnsubscribe) {
      this.userUnsubscribe();
    }
    
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/user/login']);
    });
  }
}

