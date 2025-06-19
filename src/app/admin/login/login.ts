import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  errorMessage = '';
  successMessage = '';
  returnUrl: string = '/admin/dashboard';

  constructor(
    private formBuilder: FormBuilder,
    private authService: Auth,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Get return url from route parameters or default to '/admin/dashboard'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/admin/dashboard';
    
    // Check for access denied message
    if (this.route.snapshot.queryParams['accessDenied']) {
      this.errorMessage = 'Access denied. This area is for administrators only.';
    }
  }

  ngOnInit(): void {
    // Check if user was just registered
    const registered = this.route.snapshot.queryParams['registered'];
    if (registered) {
      this.successMessage = 'Registration successful! Please log in with your new account.';
    }

    // Auto-fill for testing if needed
    // this.loginForm.patchValue({
    //   email: 'test@example.com',
    //   password: 'password123'
    // });
  }

  // Convenience getter for easy access to form fields
  get f() { return this.loginForm.controls; }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Stop here if form is invalid
    if (this.loginForm.invalid) {
      return;
    }

    const email = this.f['email'].value;
    const password = this.f['password'].value;

    console.log('Attempting login with:', { email, password: '********' });
    this.loading = true;

    this.authService.login(email, password)
      .subscribe({
        next: (result) => {
          console.log('Login successful:', result);
          
          // Check if the user is an admin
          setTimeout(() => {
            const userRole = this.authService.getUserRole();
            console.log('User role after login:', userRole);
            
            if (userRole === 'admin') {
              this.router.navigate([this.returnUrl]);
            } else {
              this.errorMessage = 'Access denied. This login is for administrators only.';
              this.loading = false;
              
              // Logout the user since they're not an admin
              this.authService.logout().subscribe();
            }
          }, 500); // Small delay to ensure Firestore data is loaded
        },
        error: (error) => {
          console.error('Login error:', error);
          this.errorMessage = error.message;
          this.loading = false;
        }
      });
  }
}
