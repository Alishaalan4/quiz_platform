import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '../services/auth';

export const adminAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);
  
  console.log('Admin Auth Guard - Current URL:', state.url);
  console.log('Admin Auth Guard - User Role:', authService.getUserRole());
  
  // Check if user is logged in
  if (!authService.isLoggedIn()) {
    console.log('Admin Auth Guard - User not logged in');
    // Not logged in, redirect to admin login
    router.navigate(['/admin/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
  
  // Check if user has admin role
  const userRole = authService.getUserRole();
  console.log('Admin Auth Guard - Checking role:', userRole);
  
  if (userRole !== 'admin') {
    console.log('Admin Auth Guard - Not admin, redirecting to admin login');
    router.navigate(['/admin/login'], { queryParams: { accessDenied: true } });
    return false;
  }
  
  // Admin user, allow access
  console.log('Admin Auth Guard - Admin access granted');
  return true;
};
