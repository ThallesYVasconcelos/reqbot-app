import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
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
    return this.api.post<AuthResponse>('/api/auth/user/google', { idToken }).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  loginAsAdmin(idToken: string): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/api/auth/admin/google', { idToken }).pipe(
      tap(response => this.handleAuthResponse(response))
    );
  }

  private handleAuthResponse(response: AuthResponse | any): void {
    let authData: AuthResponse | null = null;

    if (response?.accessToken) {
      authData = response as AuthResponse;
    } else if (response?.token) {
      authData = { ...response, accessToken: response.token } as AuthResponse;
    } else if (response?.data?.accessToken) {
      authData = response.data as AuthResponse;
    } else if (response?.body?.accessToken) {
      authData = response.body as AuthResponse;
    }

    if (!authData || !authData.accessToken) {
      return;
    }

    let email = authData.email;
    let name = authData.name;

    if (!email || !name) {
      try {
        const tokenParts = authData.accessToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          email = email || payload.email || payload.sub || 'user@test.local';
          name = name || payload.name || payload.given_name || 'User';
        }
      } catch {
        email = email || 'user@test.local';
        name = name || 'User';
      }
    }

    if (isPlatformBrowser(this.platformId)) {
      const token = authData.accessToken;
      localStorage.setItem('token', token);
      const user: User = {
        id: '',
        email: email || 'user@test.local',
        name: name || 'User',
        pictureUrl: null,
        role: authData.role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.currentUser.set(user);
      localStorage.setItem('user', JSON.stringify(user));
    }

    setTimeout(() => {
      if (!isPlatformBrowser(this.platformId)) return;

      this.workspaceService.loadWorkspaces().subscribe({
        next: (workspaces) => {
          const path = workspaces.length === 0
            ? (authData!.role === 'ADMIN' ? '/admin/workspaces' : '/workspaces')
            : (authData!.role === 'ADMIN' ? '/admin/dashboard' : '/chatbot');

          this.router.navigate([path]).then(success => {
            if (!success) window.location.href = path;
          });
        },
        error: () => {
          const fallbackPath = authData!.role === 'ADMIN' ? '/admin/dashboard' : '/chatbot';
          this.router.navigate([fallbackPath]).then(success => {
            if (!success) window.location.href = fallbackPath;
          });
        }
      });
    }, 100);
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
    return this.currentUser()?.role === 'ADMIN';
  }

  isUser(): boolean {
    return this.currentUser()?.role === 'USER';
  }

  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    return localStorage.getItem('token');
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
