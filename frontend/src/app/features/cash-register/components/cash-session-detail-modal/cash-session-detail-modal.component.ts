import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CashRegisterSession, CashRegisterMovement } from '../../../../core/models/cash-register.model';
import { CashRegisterService } from '../../../../core/services/cash-register.service';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { CurrencyFormatPipe } from '../../../../shared/pipes/currency-format.pipe';
import { DateFormatPipe } from '../../../../shared/pipes/date-format.pipe';

@Component({
  selector: 'app-cash-session-detail-modal',
  standalone: true,
  imports: [CommonModule, AppButtonComponent, CurrencyFormatPipe, DateFormatPipe],
  templateUrl: './cash-session-detail-modal.component.html'
})
export class CashSessionDetailModalComponent implements OnInit {
  private cashService = inject(CashRegisterService);

  @Input() session!: CashRegisterSession;
  @Output() close = new EventEmitter<void>();

  movements = signal<CashRegisterMovement[]>([]);
  loadingMovements = signal<boolean>(true);

  ngOnInit(): void {
    if (this.session) {
      this.cashService.getSessionMovements(this.session.id).subscribe({
        next: (movs) => {
          this.movements.set(movs);
          this.loadingMovements.set(false);
        },
        error: () => this.loadingMovements.set(false)
      });
    }
  }

  onClose(): void {
    this.close.emit();
  }
}

