import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '../services/auth';

export const userAuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);
  
  console.log('User Auth Guard - Current URL:', state.url);
  console.log('User Auth Guard - User Role:', authService.getUserRole());
  
  // Check if user is logged in
  if (!authService.isLoggedIn()) {
    console.log('User Auth Guard - User not logged in');
    // Not logged in, redirect to user login
    router.navigate(['/user/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }
  
  // Check if user has user role
  const userRole = authService.getUserRole();
  console.log('User Auth Guard - Checking role:', userRole);
  
  if (userRole !== 'user') {
    console.log('User Auth Guard - Not a regular user, redirecting to user login');
    router.navigate(['/user/login'], { queryParams: { accessDenied: true } });
    return false;
  }
  
  // Regular user, allow access
  console.log('User Auth Guard - User access granted');
  return true;
};
