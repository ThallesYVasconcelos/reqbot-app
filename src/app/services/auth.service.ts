import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { WorkspaceService } from './workspace.service';
import { AuthResponse, User } from '../models/auth.model';

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
    return this.loginWithGoogle(idToken);
  }

  loginAsAdmin(idToken: string): Observable<AuthResponse> {
    return this.loginWithGoogle(idToken);
  }

  loginWithGoogle(idToken: string): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/api/auth/google', { idToken }).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
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
    return false;
  }

  isUser(): boolean {
    return this.isAuthenticated();
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem('token');
  }

  private handleAuthResponse(response: AuthResponse | any): void {
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
        next: () => this.navigateAfterLogin('/app/spaces'),
        error: () => this.navigateAfterLogin('/app/spaces')
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
