import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { 
    path: 'admin', 
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { 
        path: 'login', 
        loadComponent: () => import('./admin/login/login').then(m => m.Login) 
      },
      { 
        path: 'register', 
        loadComponent: () => import('./admin/register/register').then(m => m.Register) 
      },
      { 
        path: 'dashboard', 
        loadComponent: () => import('./admin/dashboard/dashboard').then(m => m.Dashboard),
        canActivate: [authGuard]
      },
      {
        path: 'users',
        loadComponent: () => import('./admin/users/users').then(m => m.Users),
        canActivate: [authGuard]
      },
      {
        path: 'users/create',
        loadComponent: () => import('./admin/users/user-form/user-form').then(m => m.UserFormComponent),
        canActivate: [authGuard]
      },
      {
        path: 'users/edit/:id',
        loadComponent: () => import('./admin/users/user-form/user-form').then(m => m.UserFormComponent),
        canActivate: [authGuard]
      },
      {
        path: 'quizzes',
        loadComponent: () => import('./admin/quizzes/quizzes').then(m => m.Quizzes),
        canActivate: [authGuard]
      },
      {
        path: 'quizzes/create',
        loadComponent: () => import('./admin/quizzes/quiz-form/quiz-form').then(m => m.QuizForm),
        canActivate: [authGuard]
      },
      {
        path: 'quizzes/edit/:id',
        loadComponent: () => import('./admin/quizzes/quiz-form/quiz-form').then(m => m.QuizForm),
        canActivate: [authGuard]
      }
    ]
  },
  { path: '', redirectTo: 'admin/login', pathMatch: 'full' },
  { path: '**', redirectTo: 'admin/login' }
];
