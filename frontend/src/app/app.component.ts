import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/services/auth.service';
import { SessionTimeoutService } from './core/services/session-timeout.service';
import { LoadingService } from './core/services/loading.service';
import { AppToasterComponent } from './shared/components/app-toaster/app-toaster.component';
import { SessionWarningModalComponent } from './shared/components/session-warning-modal/session-warning-modal.component';
import { AppConfirmDialogComponent } from './shared/components/app-confirm-dialog/app-confirm-dialog.component';
import { AppLoadingComponent } from './shared/components/app-loading/app-loading.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    AppToasterComponent,
    SessionWarningModalComponent,
    AppConfirmDialogComponent,
    AppLoadingComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  private authService = inject(AuthService);
  private sessionTimeoutService = inject(SessionTimeoutService);
  loadingService = inject(LoadingService);

  ngOnInit(): void {
    if (this.authService.isAuthenticated()) {
      this.sessionTimeoutService.startMonitoring();
    }

    // Intento de refresco de sesión en segundo plano
    this.authService.refresh().subscribe({
      next: () => {
        this.sessionTimeoutService.startMonitoring();
      },
      error: () => {
        // Si no hay cookie de refresco, la sesión del token actual se mantiene
      }
    });

    this.sessionTimeoutService.init();
  }
}
