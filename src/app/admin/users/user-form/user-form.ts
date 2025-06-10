import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UserService, User } from '../../../services/user.service';
import { finalize, Subscription } from 'rxjs';

// Extended user interface that includes optional password field for form handling
interface UserFormData extends User {
  password?: string;
}

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './user-form.html',
  styleUrls: ['./user-form.css']
})
export class UserFormComponent implements OnInit, OnDestroy {
  userForm!: FormGroup;
  userId: string | null = null;
  isEditMode = false;
  loading = false;
  error = '';
  success = '';
  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initForm();
    
    const routeSub = this.route.paramMap.subscribe(params => {
      this.userId = params.get('id');
      this.isEditMode = !!this.userId;
      
      if (this.isEditMode && this.userId) {
        this.loadUser(this.userId);
      } else {
        // Add password fields for new user
        this.userForm.addControl('password', this.fb.control('', [Validators.required, Validators.minLength(6)]));
        this.userForm.addControl('confirmPassword', this.fb.control('', [Validators.required]));
      }
      
      // Update form validation based on mode
      this.updateFormValidation();
    });
    
    this.subscriptions.add(routeSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  initForm(): void {
    this.userForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      role: ['user', [Validators.required]]
    });
  }

  updateFormValidation(): void {
    const passwordControl = this.userForm.get('password');
    const confirmPasswordControl = this.userForm.get('confirmPassword');
    
    if (this.isEditMode) {
      // In edit mode, password is optional
      if (passwordControl) {
        passwordControl.setValidators([Validators.minLength(6)]);
        passwordControl.updateValueAndValidity();
      }
      if (confirmPasswordControl) {
        confirmPasswordControl.setValidators([]);
        confirmPasswordControl.updateValueAndValidity();
      }
    } else {
      // In create mode, password is required
      if (passwordControl) {
        passwordControl.setValidators([Validators.required, Validators.minLength(6)]);
        passwordControl.updateValueAndValidity();
      }
      if (confirmPasswordControl) {
        confirmPasswordControl.setValidators([Validators.required]);
        confirmPasswordControl.updateValueAndValidity();
      }
    }
  }

  loadUser(id: string): void {
    // Only show loading if it takes more than a moment to load
    const userSub = this.userService.getUser(id).subscribe({
      next: (user) => {
        if (user) {
          // Remove password fields from the form data
          const { id, createdAt, ...formData } = user;
          this.userForm.patchValue(formData);
        } else {
          this.error = 'User not found';
          this.router.navigate(['/admin/users']);
        }
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load user';
        this.loading = false;
        console.error('Error loading user:', err);
      }
    });
    
    this.subscriptions.add(userSub);
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.markFormGroupTouched(this.userForm);
      return;
    }

    // Check if passwords match for new users
    if (!this.isEditMode) {
      const password = this.userForm.get('password')?.value;
      const confirmPassword = this.userForm.get('confirmPassword')?.value;
      
      if (password !== confirmPassword) {
        this.error = 'Passwords do not match';
        return;
      }
    }

    this.error = '';
    const userData = { ...this.userForm.value };
    
    // Add createdAt for new users
    if (!this.isEditMode) {
      userData.createdAt = new Date().toISOString();
    }

    if (this.isEditMode && this.userId) {
      // Remove password fields if they're empty
      if (userData.password === '') {
        delete userData.password;
        delete userData.confirmPassword;
      }
      
      const updateSub = this.userService.updateUser(this.userId, userData)
        .subscribe({
          next: () => {
            this.router.navigate(['/admin/users']);
          },
          error: (err) => {
            this.error = err.message || 'Failed to update user';
            console.error('Error updating user:', err);
          }
        });
        
      this.subscriptions.add(updateSub);
    } else {
      const createSub = this.userService.createUser(userData)
        .subscribe({
          next: (userId) => {
            console.log('User created with ID:', userId);
            this.router.navigate(['/admin/users']);
          },
          error: (err) => {
            this.error = err.message || 'Failed to create user';
            console.error('Error creating user:', err);
          }
        });
        
      this.subscriptions.add(createSub);
    }
  }

  markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if ((control as any).controls) {
        this.markFormGroupTouched(control as FormGroup);
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin/users']);
  }
} 