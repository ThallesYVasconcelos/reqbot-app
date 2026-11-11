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
    const profile = response?.user || response?.data?.user || response?.profile || response?.data?.profile || {};
    const email = response?.email || response?.data?.email || profile.email || payload?.email || payload?.sub || 'user@test.local';
    const name = response?.name || response?.data?.name || response?.userName || response?.username || profile.name || profile.fullName || profile.displayName || profile.givenName || payload?.name || payload?.given_name || 'User';
    const pictureUrl = response?.pictureUrl || response?.picture || response?.photoUrl || response?.imageUrl || response?.avatarUrl || response?.data?.pictureUrl || response?.data?.picture || response?.data?.photoUrl || profile.pictureUrl || profile.picture || profile.photoUrl || profile.imageUrl || profile.avatarUrl || payload?.picture || null;

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', token);

      const user: User = {
        id: payload?.id || payload?.sub || '',
        email,
        name,
        pictureUrl,
        role: 'USER',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.currentUser.set(user);
      localStorage.setItem('user', JSON.stringify(user));
    }

    this.workspaceService.loadWorkspaces().subscribe({
      next: () => this.navigateAfterLogin(mode === 'manager' ? '/app/home' : '/chatbots/join'),
      error: () => this.navigateAfterLogin(mode === 'manager' ? '/app/home' : '/chatbots/join')
    });
  }

  private readJwtPayload(token: string): any | null {
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) return null;
      const encoded = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(encoded.padEnd(encoded.length + (4 - encoded.length % 4) % 4, '=')));
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
        const stored = JSON.parse(userStr) as User;
        const payload = this.readJwtPayload(localStorage.getItem('token') || '');
        const updated = {
          ...stored,
          name: stored.name && stored.name !== 'User' ? stored.name : payload?.name || payload?.given_name || stored.name,
          pictureUrl: stored.pictureUrl || payload?.picture || payload?.pictureUrl || null
        };
        this.currentUser.set(updated);
        localStorage.setItem('user', JSON.stringify(updated));
      } catch {}
    }
  }
}
