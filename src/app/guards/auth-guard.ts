import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '../services/auth';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);
  
  console.log('Auth Guard - Current URL:', state.url);
  console.log('Auth Guard - User Role:', authService.getUserRole());
  
  // Check if user is logged in
  if (!authService.isLoggedIn()) {
    console.log('Auth Guard - User not logged in');
    // Not logged in, redirect to login
    if (state.url.includes('/admin')) {
      router.navigate(['/admin/login'], { queryParams: { returnUrl: state.url } });
    } else {
      router.navigate(['/user/login'], { queryParams: { returnUrl: state.url } });
    }
    return false;
  }
  
  // Check role based on URL
  const userRole = authService.getUserRole();
  console.log('Auth Guard - Checking role:', userRole);
  
  // Admin routes should only be accessible by admin users
  if (state.url.includes('/admin')) {
    console.log('Auth Guard - Checking admin access');
    if (userRole !== 'admin') {
      console.log('Auth Guard - Not admin, redirecting to user login');
      router.navigate(['/user/dashboard']);
      return false;
    }
    return true;
  }
  
  // User routes should only be accessible by regular users
  if (state.url.includes('/user/dashboard') || state.url.includes('/user/profile')) {
    console.log('Auth Guard - Checking user access');
    if (userRole !== 'user') {
      console.log('Auth Guard - Not user, redirecting to admin dashboard');
      router.navigate(['/admin/dashboard']);
      return false;
    }
    return true;
  }
  
  // If we get here, allow access
  return true;
};
