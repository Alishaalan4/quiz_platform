import { Component, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  registerForm: FormGroup;
  loading = false;
  submitted = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: Auth,
    private router: Router,
    private ngZone: NgZone
  ) {
    this.registerForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, {
      validator: this.passwordMatchValidator
    });
  }

  // Convenience getter for easy access to form fields
  get f() { return this.registerForm.controls; }

  // Custom validator to check if password and confirm password match
  passwordMatchValidator(formGroup: FormGroup) {
    const password = formGroup.get('password')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;

    if (password !== confirmPassword) {
      formGroup.get('confirmPassword')?.setErrors({ passwordMismatch: true });
    } else {
      formGroup.get('confirmPassword')?.setErrors(null);
    }
  }

  onSubmit() {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Stop here if form is invalid
    if (this.registerForm.invalid) {
      return;
    }

    const name = this.f['name'].value;
    const email = this.f['email'].value;
    const password = this.f['password'].value;

    console.log('Attempting registration with:', { name, email, password: '********' });

    this.authService.registerAdmin(name, email, password)
      .subscribe({
        next: (result) => {
          console.log('Registration successful:', result);
          
          // Force sign out the user after registration
          this.authService.logout().subscribe({
            next: () => {
              console.log('Logged out after registration');
              this.redirectToLogin();
            },
            error: (err) => {
              console.error('Error logging out after registration:', err);
              // Still redirect to login even if logout fails
              this.redirectToLogin();
            }
          });
        },
        error: (error) => {
          console.error('Registration error:', error);
          this.errorMessage = error.message;
          this.loading = false;
        }
      });
  }

  private redirectToLogin() {
    this.router.navigate(['/admin/login'], { 
      queryParams: { registered: 'true' } 
    });
  }
}
