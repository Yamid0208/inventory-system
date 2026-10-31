import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { NavbarComponent } from '../navbar/navbar.component';
import { TermsModalComponent } from '../../shared/components/terms-modal/terms-modal.component';
import { AuthService } from '../../core/auth/services/auth.service';
import { LegalService } from '../../core/legal/services/legal.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, NavbarComponent, TermsModalComponent],
  templateUrl: './main-layout.component.html'
})
export class MainLayoutComponent implements OnInit {
  authService = inject(AuthService);
  legalService = inject(LegalService);

  // Aceptación obligatoria: si el usuario está autenticado y hasAcceptedTerms es falso
  mustAcceptTerms = computed(() => {
    const user = this.authService.currentUser();
    return !!user && user.hasAcceptedTerms === false;
  });

  // Modal abierto por el usuario para consulta informativa
  isViewerOpen = this.legalService.isLegalModalOpen;

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user && user.hasAcceptedTerms === undefined) {
      this.legalService.getConsentStatus().subscribe({
        next: (status) => {
          this.authService.updateTermsAccepted(status.hasAccepted);
        }
      });
    }
  }

  onTermsAccepted(): void {
    this.authService.updateTermsAccepted(true);
  }

  onCloseViewer(): void {
    this.legalService.closeLegalViewer();
  }
}
