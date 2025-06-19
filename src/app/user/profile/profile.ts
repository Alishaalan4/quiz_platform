import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../services/auth';
import { 
  getFirestore, doc, getDoc, updateDoc, onSnapshot, DocumentData 
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, updatePassword } from 'firebase/auth';

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
const auth = getAuth(app);

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit, OnDestroy {
  userName: string = '';
  userEmail: string = '';
  userId: string = '';
  
  passwordForm: FormGroup;
  
  loading: boolean = false;
  success: string = '';
  error: string = '';
  
  private userUnsubscribe: any;

  constructor(
    private authService: Auth,
    private router: Router,
    private fb: FormBuilder,
    private ngZone: NgZone
  ) {
    // Initialize form
    this.passwordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
    
    // Get current user details
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.userId = currentUser.uid;
      this.userEmail = currentUser.email || '';
      
      // Fetch user data immediately
      this.fetchUserData();
      
      // Set up real-time listener for user data
      this.setupUserListener();
    } else {
      // Redirect to login if no user found
      this.router.navigate(['/user/login']);
    }
  }

  ngOnInit() {
    // Component already initialized in constructor
  }
  
  ngOnDestroy() {
    // Clean up listener
    if (this.userUnsubscribe) {
      this.userUnsubscribe();
    }
  }
  
  // Immediately fetch user data
  private async fetchUserData() {
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
  
  // Password match validator
  passwordMatchValidator(g: FormGroup) {
    const newPassword = g.get('newPassword')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    
    return newPassword === confirmPassword ? null : { 'mismatch': true };
  }
  
  // Update password
  async updatePassword() {
    if (this.passwordForm.invalid) {
      this.markFormGroupTouched(this.passwordForm);
      return;
    }
    
    if (this.passwordForm.hasError('mismatch')) {
      this.error = 'New password and confirmation do not match';
      return;
    }
    
    this.loading = true;
    this.error = '';
    this.success = '';
    
    try {
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        // Update password in Firebase Auth
        await updatePassword(currentUser, this.passwordForm.value.newPassword);
        
        this.ngZone.run(() => {
          this.success = 'Password updated successfully';
          this.passwordForm.reset();
          this.loading = false;
        });
      } else {
        this.ngZone.run(() => {
          this.error = 'User not authenticated. Please log in again.';
          this.loading = false;
        });
      }
    } catch (error: any) {
      this.ngZone.run(() => {
        this.error = error.message || 'Failed to update password';
        this.loading = false;
      });
    }
  }
  
  // Mark all form controls as touched to trigger validation
  markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }
  
  // Navigate back to dashboard
  goToDashboard() {
    this.router.navigate(['/user/dashboard']);
  }
  
  // Logout
  logout() {
    // Clean up listener before logout
    if (this.userUnsubscribe) {
      this.userUnsubscribe();
    }
    
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/user/login']);
    });
  }
}
