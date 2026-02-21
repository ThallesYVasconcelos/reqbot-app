import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent {
  showMenu = signal(true); // Sempre visível em desktop

  constructor(public authService: AuthService) {}

  logout(): void {
    this.authService.logout();
  }

  toggleMenu(): void {
    this.showMenu.update(val => !val);
  }
}
