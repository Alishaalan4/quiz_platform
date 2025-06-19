import { Routes } from '@angular/router';
import { adminAuthGuard } from './guards/admin-auth.guard';
import { userAuthGuard } from './guards/user-auth.guard';

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
        canActivate: [adminAuthGuard]
      },
      {
        path: 'users',
        loadComponent: () => import('./admin/users/users').then(m => m.Users),
        canActivate: [adminAuthGuard]
      },
      {
        path: 'users/new',
        loadComponent: () => import('./admin/users/user-form/user-form').then(m => m.UserFormComponent),
        canActivate: [adminAuthGuard]
      },
      {
        path: 'users/edit/:id',
        loadComponent: () => import('./admin/users/user-form/user-form').then(m => m.UserFormComponent),
        canActivate: [adminAuthGuard]
      },
      {
        path: 'quizzes',
        loadComponent: () => import('./admin/quizzes/quizzes').then(m => m.Quizzes),
        canActivate: [adminAuthGuard]
      },
      {
        path: 'quizzes/new',
        loadComponent: () => import('./admin/quizzes/quiz-form/quiz-form').then(m => m.QuizForm),
        canActivate: [adminAuthGuard]
      },
      {
        path: 'quizzes/edit/:id',
        loadComponent: () => import('./admin/quizzes/quiz-form/quiz-form').then(m => m.QuizForm),
        canActivate: [adminAuthGuard]
      }
    ]
  },
  { 
    path: 'user', 
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { 
        path: 'login', 
        loadComponent: () => import('./user/login/login').then(m => m.Login) 
      },
      { 
        path: 'register', 
        loadComponent: () => import('./user/register/register').then(m => m.Register) 
      },
      { 
        path: 'dashboard', 
        loadComponent: () => import('./user/dashboard/dashboard').then(m => m.Dashboard),
        canActivate: [userAuthGuard]
      },
      {
        path: 'profile',
        loadComponent: () => import('./user/profile/profile').then(m => m.Profile),
        canActivate: [userAuthGuard]
      },
      {
        path: 'quizzes',
        loadComponent: () => import('./user/quizzes/quizzes').then(m => m.Quizzes),
        canActivate: [userAuthGuard]
      },
      {
        path: 'quizzes/take/:id',
        loadComponent: () => import('./user/quizzes/quiz-take/quiz-take').then(m => m.QuizTake),
        canActivate: [userAuthGuard]
      }
    ]
  },
  { path: '', redirectTo: 'user/login', pathMatch: 'full' },
  { path: '**', redirectTo: 'user/login' }
];
