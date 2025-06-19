import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;
  returnUrl: string = '/user/dashboard';

  constructor(
    private fb: FormBuilder,
    private authService: Auth,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    // Get return URL from route parameters or default to '/user/dashboard'
    this.route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || '/user/dashboard';
    });
    
    // Check for access denied message
    if (this.route.snapshot.queryParams['accessDenied']) {
      this.errorMessage = 'Access denied. This area is for regular users only.';
    }
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.loginForm.controls).forEach(key => {
        this.loginForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        console.log('User logged in successfully');
        
        // Small delay to ensure role is fetched from Firestore
        setTimeout(() => {
          // Check if user is in the database and has 'user' role
          const currentUser = this.authService.getCurrentUser();
          const userRole = this.authService.getUserRole();
          
          if (currentUser && userRole === 'user') {
            // Success - redirect to dashboard
            this.router.navigateByUrl(this.returnUrl);
          } else {
            this.errorMessage = 'Access denied. This area is for users only.';
            this.isLoading = false;
            this.authService.logout().subscribe();
          }
        }, 1000);
      },
      error: (error) => {
        console.error('Login error:', error);
        this.errorMessage = error.message || 'Login failed. Please check your credentials.';
        this.isLoading = false;
      }
    });
  }

  // Navigate to registration page
  goToRegister() {
    this.router.navigate(['/user/register']);
  }
}
