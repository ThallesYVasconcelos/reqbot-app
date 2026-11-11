import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private navSub?: Subscription;

  /** Barra lateral aberta. Em ≥lg inicia aberta após init; em mobile continua fechada (sem “flash” do overlay). */
  showMenu = signal(false);
  constructor(public authService: AuthService, public themeService: ThemeService) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('reqbot-admin-sidebar');
      this.showMenu.set(stored === null
        ? window.matchMedia('(min-width: 1024px)').matches
        : stored === 'open');
    }
    this.navSub = this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        if (isPlatformBrowser(this.platformId) && !window.matchMedia('(min-width: 1024px)').matches) {
          this.showMenu.set(false);
        }
      });
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  logout(): void {
    this.authService.logout();
  }

  toggleMenu(): void {
    this.showMenu.update(val => !val);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('reqbot-admin-sidebar', this.showMenu() ? 'open' : 'closed');
    }
  }

}
