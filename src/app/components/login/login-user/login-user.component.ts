import { Component, signal, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';

declare var google: any;

@Component({
  selector: 'app-login-user',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './login-user.component.html',
  styleUrl: './login-user.component.css'
})
export class LoginUserComponent implements OnInit {
  error = signal<string | null>(null);
  loading = signal(false);
  googleAvailable = signal(false);
  private platformId = inject(PLATFORM_ID);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    if (this.authService.isAuthenticated()) {
      const user = this.authService.user();
      if (user?.role === 'USER') {
        this.router.navigate(['/chatbot']);
      }
    }
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadGoogleScript();
    }
  }

  private loadGoogleScript(): void {
    if (typeof google !== 'undefined' && google.accounts) {
      this.googleAvailable.set(true);
      this.initializeGoogleSignIn();
      return;
    }

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      const checkInterval = setInterval(() => {
        if (typeof google !== 'undefined' && google.accounts) {
          clearInterval(checkInterval);
          this.googleAvailable.set(true);
          this.initializeGoogleSignIn();
        }
      }, 100);
      
      setTimeout(() => clearInterval(checkInterval), 10000);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.googleAvailable.set(true);
      setTimeout(() => this.initializeGoogleSignIn(), 200);
    };
    script.onerror = () => {
      this.error.set('Erro ao carregar Google OAuth. Verifique sua conexão com a internet.');
    };
    document.head.appendChild(script);
  }

  private initializeGoogleSignIn(): void {
    if (typeof google === 'undefined' || !google.accounts) {
      setTimeout(() => this.initializeGoogleSignIn(), 500);
      return;
    }

    try {
      const clientId = environment.googleClientId;
      
      if (!clientId) {
        this.error.set('Google OAuth não configurado. Configure o googleClientId em environment.ts.');
        return;
      }

      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => this.handleCredentialResponse(response.credential)
      });

      setTimeout(() => {
        const buttonElement = document.getElementById('google-signin-button-user');
        if (buttonElement) {
          try {
            google.accounts.id.renderButton(buttonElement, {
              theme: 'outline',
              size: 'large',
              text: 'signin_with',
              width: 300,
              locale: 'pt-BR'
            });
          } catch {
            this.error.set('Erro ao renderizar botão do Google.');
          }
        } else {
          this.error.set('Erro: elemento do botão não encontrado. Recarregue a página.');
        }
      }, 300);
    } catch (error: any) {
      this.googleAvailable.set(false);
      if (error?.message?.includes('origin') || error?.message?.includes('invalid_client')) {
        this.error.set('Erro de configuração do Google OAuth. Verifique se a origem está registrada no Google Cloud Console.');
      } else {
        this.error.set('Erro ao inicializar Google OAuth: ' + (error?.message || 'Erro desconhecido'));
      }
    }
  }

  triggerGoogleSignIn(): void {
    if (typeof google === 'undefined' || !google.accounts?.id) return;
    try {
      google.accounts.id.prompt();
    } catch {
      this.error.set('Erro ao iniciar login com Google.');
    }
  }

  private handleCredentialResponse(credential: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.authService.loginAsUser(credential).subscribe({
      next: () => this.loading.set(false),
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'Erro ao fazer login como usuário');
      }
    });
  }
}
