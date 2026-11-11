import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { filter } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('ReqBot');
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(event => {
      localStorage.setItem('reqbot-last-route', (event as NavigationEnd).urlAfterRedirects);
    });

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const lastRoute = localStorage.getItem('reqbot-last-route');
    if (navigation?.type === 'reload' && lastRoute && lastRoute !== this.router.url && !lastRoute.startsWith('/login')) {
      queueMicrotask(() => this.router.navigateByUrl(lastRoute));
    }
  }
}
