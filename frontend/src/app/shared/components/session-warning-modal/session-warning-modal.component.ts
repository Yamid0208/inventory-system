import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionTimeoutService } from '../../../core/services/session-timeout.service';

@Component({
  selector: 'app-session-warning-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './session-warning-modal.component.html'
})
export class SessionWarningModalComponent {
  sessionTimeoutService = inject(SessionTimeoutService);
}
