import { Component, OnDestroy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, RouterOutlet, Router, NavigationEnd, Event } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
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

  constructor(public authService: AuthService) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId) && window.matchMedia('(min-width: 1024px)').matches) {
      this.showMenu.set(true);
    }
    this.navSub = this.router.events
      .pipe(filter((e: Event) => e instanceof NavigationEnd))
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
}
