import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { createEnvironmentInjector } from '@angular/core';
import { SessionWarningModalComponent } from './session-warning-modal.component';
import { SessionTimeoutService } from '../../../core/services/session-timeout.service';

describe('SessionWarningModalComponent (Unit Tests)', () => {
  const sessionTimeoutServiceMock = {
    showWarning: () => false,
    remainingSeconds: () => 45,
    extendSession: () => {},
    autoLogout: () => {}
  };

  const injector = createEnvironmentInjector([
    SessionWarningModalComponent,
    { provide: SessionTimeoutService, useValue: sessionTimeoutServiceMock }
  ], null as any);

  const component = injector.get(SessionWarningModalComponent);

  it('should instantiate session warning modal', () => {
    expect(component).toBeTruthy();
    expect(component.sessionTimeoutService).toBeTruthy();
  });
});
