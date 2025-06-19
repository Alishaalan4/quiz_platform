import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { environment } from '../environments/environment';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { QuizService } from './services/quiz.service';
import { UserService } from './services/user.service';
import { QuizAttemptService } from './services/quiz-attempt.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimations(),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),
    provideClientHydration(withEventReplay()),
    // Explicitly enable Zone.js
    provideZoneChangeDetection(),
    // Provide our services
    QuizService,
    UserService,
    QuizAttemptService
  ]
};
