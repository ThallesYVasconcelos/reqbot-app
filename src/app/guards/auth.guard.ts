import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuth = authService.isAuthenticated();

  if (isAuth) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const managerGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login/admin']);
    return false;
  }

  if (authService.getSessionMode() === 'manager') {
    return true;
  }

  router.navigate(['/chatbots/join']);
  return false;
};

export const chatbotGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  router.navigate(['/login/user']);
  return false;
};
