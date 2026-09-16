import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { SidebarService } from '../../core/services/sidebar.service';
import { AlertService } from '../../core/services/alert.service';
import { BranchContextService } from '../../core/services/branch-context.service';
import { AppBadgeComponent } from '../../shared/components/app-badge/app-badge.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, AppBadgeComponent],
  templateUrl: './navbar.component.html'
})
export class NavbarComponent implements OnInit {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  sidebarService = inject(SidebarService);
  alertService = inject(AlertService);
  branchContextService = inject(BranchContextService);
  private router = inject(Router);

  searchQuery = '';
  isBranchDropdownOpen = signal<boolean>(false);

  ngOnInit(): void {
    this.alertService.checkUnreadStatus();
  }

  toggleBranchDropdown(): void {
    if (this.branchContextService.canChangeBranch()) {
      this.isBranchDropdownOpen.update(v => !v);
      if (this.isBranchDropdownOpen()) {
        this.branchContextService.refreshWarehouses();
      }
    }
  }

  selectBranch(warehouseId: number | null): void {
    this.branchContextService.setSelectedWarehouseId(warehouseId);
    this.isBranchDropdownOpen.set(false);
  }

  logout(): void {
    this.authService.logout().subscribe();
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  goToAlerts(): void {
    this.alertService.markAsSeen();
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

