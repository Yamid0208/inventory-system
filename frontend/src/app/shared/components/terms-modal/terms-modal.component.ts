import { Component, OnInit, inject, signal, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LegalService } from '../../../core/legal/services/legal.service';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LegalConsentResult, LegalDocuments } from '../../../core/legal/models/legal.models';

@Component({
  selector: 'app-terms-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './terms-modal.component.html'
})
export class TermsModalComponent implements OnInit {
  private legalService = inject(LegalService);
  private authService = inject(AuthService);

  isMandatory = input<boolean>(true);
  isOpen = input<boolean>(true);

  accepted = output<LegalConsentResult>();
  closed = output<void>();

  activeTab = signal<'terms' | 'privacy'>('terms');
  agreed = signal<boolean>(false);
  submitting = signal<boolean>(false);
  error = signal<string | null>(null);
  documents = signal<LegalDocuments | null>(null);

  currentUser = this.authService.currentUser;
  userEmail = computed(() => this.currentUser()?.email ?? '');
  userName = computed(() => this.currentUser()?.fullName ?? '');
  userRole = computed(() => this.currentUser()?.role ?? '');
  currentDate = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.legalService.getDocuments().subscribe({
      next: (docs) => this.documents.set(docs),
      error: () => {
        // En caso de fallo de red, se mantiene el documento legal predeterminado
      }
    });
  }

  setTab(tab: 'terms' | 'privacy'): void {
    this.activeTab.set(tab);
  }

  onAccept(): void {
    if (!this.agreed() || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const version = this.documents()?.termsVersion ?? '1.0';
    const privacyVersion = this.documents()?.privacyVersion ?? '1.0';

    this.legalService.acceptTerms({
      termsVersion: version,
      privacyPolicyVersion: privacyVersion
    }).subscribe({
      next: (result) => {
        this.submitting.set(false);
        this.authService.updateTermsAccepted(true);
        this.accepted.emit(result);
      },
      error: (err) => {
        this.submitting.set(false);
        const detail = err?.error?.detail || 'No se pudo registrar la aceptación. Por favor, reintente en unos instantes.';
        this.error.set(detail);
      }
    });
  }

  onClose(): void {
    if (this.isMandatory()) {
      return; // No se puede cerrar si es de obligatoria aceptación
    }
    this.closed.emit();
  }
}

