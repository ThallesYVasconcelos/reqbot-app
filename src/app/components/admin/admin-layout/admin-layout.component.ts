import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';

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
  searchTerm = signal('');

  constructor(public authService: AuthService) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId) && window.matchMedia('(min-width: 1024px)').matches) {
      this.showMenu.set(true);
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
  }

  onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  submitSearch(): void {
    const term = this.searchTerm().trim();
    this.router.navigate(['/app/requirements'], {
      queryParams: term ? { search: term } : {}
    });
    this.searchTerm.set('');
  }
}
