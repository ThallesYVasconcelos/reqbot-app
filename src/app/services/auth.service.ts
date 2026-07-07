import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { WorkspaceService } from './workspace.service';
import { AuthResponse, User } from '../models/auth.model';

export type SessionMode = 'manager' | 'user';
const SESSION_MODE_KEY = 'sessionMode';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser = signal<User | null>(null);
  public readonly user = this.currentUser.asReadonly();
  private platformId = inject(PLATFORM_ID);

  constructor(
    private api: ApiService,
    private router: Router,
    private workspaceService: WorkspaceService
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.loadUserFromStorage();
    }
  }

  loginAsUser(idToken: string): Observable<AuthResponse> {
    return this.loginWithGoogle(idToken, 'user');
  }

  loginAsAdmin(idToken: string): Observable<AuthResponse> {
    return this.loginWithGoogle(idToken, 'manager');
  }

  loginWithGoogle(idToken: string, mode: SessionMode = 'manager'): Observable<AuthResponse> {
    this.setSessionMode(mode);
    return this.api.post<AuthResponse>('/api/auth/google', { idToken }).pipe(
      tap(response => this.handleAuthResponse(response, mode))
    );
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem(SESSION_MODE_KEY);
    }
    this.workspaceService.clearSelection();
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    return !!localStorage.getItem('token');
  }

  isAdmin(): boolean {
    return this.getSessionMode() === 'manager';
  }

  isUser(): boolean {
    return this.getSessionMode() === 'user';
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem('token');
  }

  getSessionMode(): SessionMode | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    const mode = localStorage.getItem(SESSION_MODE_KEY);
    return mode === 'manager' || mode === 'user' ? mode : null;
  }

  setSessionMode(mode: SessionMode): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(SESSION_MODE_KEY, mode);
    }
  }

  private handleAuthResponse(response: AuthResponse | any, mode: SessionMode): void {
    const token =
      response?.token ||
      response?.accessToken ||
      response?.data?.token ||
      response?.data?.accessToken ||
      response?.body?.token ||
      response?.body?.accessToken;

    if (!token) {
      return;
    }

    const payload = this.readJwtPayload(token);
    const email = response?.email || response?.data?.email || payload?.email || payload?.sub || 'user@test.local';
    const name = response?.name || response?.data?.name || payload?.name || payload?.given_name || 'User';

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', token);

      const user: User = {
        id: payload?.id || payload?.sub || '',
        email,
        name,
        pictureUrl: payload?.picture || null,
        role: 'USER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.currentUser.set(user);
      localStorage.setItem('user', JSON.stringify(user));
    }

    setTimeout(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      this.workspaceService.loadWorkspaces().subscribe({
        next: () => this.navigateAfterLogin(mode === 'manager' ? '/app/home' : '/chatbots/join'),
        error: () => this.navigateAfterLogin(mode === 'manager' ? '/app/home' : '/chatbots/join')
      });
    }, 100);
  }

  private readJwtPayload(token: string): any | null {
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) return null;
      return JSON.parse(atob(tokenParts[1]));
    } catch {
      return null;
    }
  }

  private navigateAfterLogin(path: string): void {
    this.router.navigate([path]).then(success => {
      if (!success && isPlatformBrowser(this.platformId)) {
        window.location.href = path;
      }
    });
  }

  private loadUserFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        this.currentUser.set(JSON.parse(userStr));
      } catch {}
    }
  }
}
