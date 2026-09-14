import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { SidebarService } from '../../core/services/sidebar.service';
import { AppBadgeComponent } from '../../shared/components/app-badge/app-badge.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, AppBadgeComponent],
  templateUrl: './navbar.component.html'
})
export class NavbarComponent {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  sidebarService = inject(SidebarService);
  private router = inject(Router);

  searchQuery = '';

  logout(): void {
    this.authService.logout().subscribe();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  goToAlerts(): void {
    this.router.navigate(['/alerts']);
  }

  goToSettings(): void {
    this.router.navigate(['/settings']);
  }

  onGlobalSearch(): void {
    const query = this.searchQuery.trim();
    if (query) {
      this.router.navigate(['/products'], { queryParams: { search: query } });
    }
  }
}
