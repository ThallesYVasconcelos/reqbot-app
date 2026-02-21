import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuth = authService.isAuthenticated();
  const isAdmin = authService.isAdmin();

  if (isAuth && isAdmin) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
