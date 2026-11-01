import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CashRegisterService } from '../../core/services/cash-register.service';
import { NotificationService } from '../../core/services/notification.service';
import { WarehouseService } from '../../core/services/warehouse.service';
import { AuthService } from '../../core/auth/services/auth.service';
import {
  CashRegisterSession,
  CashRegisterMovement,
  CashRegisterAuditSummary,
  OpenCashRegisterRequest,
  CreateCashMovementRequest,
  CloseCashRegisterRequest
} from '../../core/models/cash-register.model';
import { Warehouse } from '../../core/models/warehouse.model';

import { AppButtonComponent } from '../../shared/components/app-button/app-button.component';
import { AppCardComponent } from '../../shared/components/app-card/app-card.component';
import { AppBadgeComponent } from '../../shared/components/app-badge/app-badge.component';
import { AppPaginationComponent } from '../../shared/components/app-pagination/app-pagination.component';
import { PageChangeEvent } from '../../shared/models/pagination.model';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { DateFormatPipe } from '../../shared/pipes/date-format.pipe';

import { OpenCashModalComponent } from './components/open-cash-modal/open-cash-modal.component';
import { CashMovementModalComponent } from './components/cash-movement-modal/cash-movement-modal.component';
import { CashReconciliationModalComponent } from './components/cash-reconciliation-modal/cash-reconciliation-modal.component';
import { CashSessionDetailModalComponent } from './components/cash-session-detail-modal/cash-session-detail-modal.component';

@Component({
  selector: 'app-cash-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AppButtonComponent,
    AppCardComponent,
    AppBadgeComponent,
    AppPaginationComponent,
    CurrencyFormatPipe,
    DateFormatPipe,
    OpenCashModalComponent,
    CashMovementModalComponent,
    CashReconciliationModalComponent,
    CashSessionDetailModalComponent
  ],
  templateUrl: './cash-register.component.html'
})
export class CashRegisterComponent implements OnInit {
  private cashService = inject(CashRegisterService);
  private notificationService = inject(NotificationService);
  private warehouseService = inject(WarehouseService);
  public authService = inject(AuthService);

  activeTab = signal<'operation' | 'history'>('operation');

  // Estados de la sesión actual
  activeSession = signal<CashRegisterSession | null>(null);
  liveMovements = signal<CashRegisterMovement[]>([]);
  loading = signal<boolean>(true);

  // Estados del historial
  historySessions = signal<CashRegisterSession[]>([]);
  historyLoading = signal<boolean>(false);
  totalHistoryCount = signal<number>(0);
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);
  filterStatus = signal<string>('all');
  filterStartDate = signal<string>('');
  filterEndDate = signal<string>('');

  // Auxiliares
  warehouses = signal<Warehouse[]>([]);
  auditSummary = signal<CashRegisterAuditSummary | null>(null);
  selectedHistorySession = signal<CashRegisterSession | null>(null);

  // Modales
  showOpenModal = signal<boolean>(false);
  showMovementModal = signal<boolean>(false);
  movementModalInitialType = signal<'ManualInflow' | 'ManualOutflow' | 'CashWithdrawal'>('ManualOutflow');
  showReconciliationModal = signal<boolean>(false);
  showDetailModal = signal<boolean>(false);
  modalLoading = signal<boolean>(false);
  modalError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadCurrentSession();
    this.loadWarehouses();
  }

  loadCurrentSession(): void {
    this.loading.set(true);
    this.cashService.getCurrentSession().subscribe({
      next: (session) => {
        this.activeSession.set(session);
        this.loading.set(false);
        if (session) {
          this.loadLiveMovements(session.id);
        }
      },
      error: () => {
        this.activeSession.set(null);
        this.loading.set(false);
      }
    });
  }

  loadLiveMovements(sessionId: number): void {
    this.cashService.getSessionMovements(sessionId).subscribe({
      next: (movs) => this.liveMovements.set(movs),
      error: () => this.liveMovements.set([])
    });
  }

  loadWarehouses(): void {
    this.warehouseService.getWarehouses().subscribe({
      next: (whs) => this.warehouses.set(whs || []),
      error: () => this.warehouses.set([])
    });
  }

  switchTab(tab: 'operation' | 'history'): void {
    this.activeTab.set(tab);
    if (tab === 'history') {
      this.loadHistory();
    } else {
      this.loadCurrentSession();
    }
  }

  loadHistory(): void {
    this.historyLoading.set(true);
    this.cashService.getSessions({
      pageNumber: this.currentPage(),
      pageSize: this.pageSize(),
      status: this.filterStatus(),
      startDate: this.filterStartDate() || undefined,
      endDate: this.filterEndDate() || undefined
    }).subscribe({
      next: (result) => {
        this.historySessions.set(result.items);
        this.totalHistoryCount.set(result.totalCount);
        this.historyLoading.set(false);
      },
      error: (err) => {
        this.notificationService.error('Error al cargar el historial de cajas.');
        this.historyLoading.set(false);
      }
    });
  }

  onPageChange(event: PageChangeEvent): void {
    this.currentPage.set(event.pageNumber);
    this.pageSize.set(event.pageSize);
    this.loadHistory();
  }

  // Operaciones de Apertura
  openOpenModal(): void {
    this.modalError.set(null);
    this.showOpenModal.set(true);
  }

  handleOpenCash(request: OpenCashRegisterRequest): void {
    this.modalLoading.set(true);
    this.modalError.set(null);
    this.cashService.openSession(request).subscribe({
      next: (session) => {
        this.modalLoading.set(false);
        this.showOpenModal.set(false);
        this.activeSession.set(session);
        this.notificationService.success(`Caja ${session.sessionNumber} abierta con éxito.`);
        this.loadCurrentSession();
      },
      error: (err) => {
        this.modalLoading.set(false);
        const msg = err?.error?.message || 'Error al realizar la apertura de caja.';
        this.modalError.set(msg);
      }
    });
  }

  // Operaciones de Movimientos
  openMovementModal(type: 'ManualInflow' | 'ManualOutflow' | 'CashWithdrawal'): void {
    this.movementModalInitialType.set(type);
    this.modalError.set(null);
    this.showMovementModal.set(true);
  }

  handleCreateMovement(request: CreateCashMovementRequest): void {
    this.modalLoading.set(true);
    this.modalError.set(null);
    this.cashService.createMovement(request).subscribe({
      next: () => {
        this.modalLoading.set(false);
        this.showMovementModal.set(false);
        this.notificationService.success('Movimiento registrado exitosamente.');
        this.loadCurrentSession();
      },
      error: (err) => {
        this.modalLoading.set(false);
        const msg = err?.error?.message || 'Error al registrar el movimiento.';
        this.modalError.set(msg);
      }
    });
  }

  // Operaciones de Arqueo y Cierre
  openReconciliationModal(): void {
    const session = this.activeSession();
    if (!session) return;

    this.modalLoading.set(true);
    this.cashService.getAuditSummary(session.id).subscribe({
      next: (summary) => {
        this.auditSummary.set(summary);
        this.modalLoading.set(false);
        this.modalError.set(null);
        this.showReconciliationModal.set(true);
      },
      error: (err) => {
        this.modalLoading.set(false);
        this.notificationService.error('Error al calcular el arqueo de caja.');
      }
    });
  }

  handleCloseCash(request: CloseCashRegisterRequest): void {
    const session = this.activeSession();
    if (!session) return;

    this.modalLoading.set(true);
    this.modalError.set(null);
    this.cashService.closeSession(session.id, request).subscribe({
      next: (closedSession) => {
        this.modalLoading.set(false);
        this.showReconciliationModal.set(false);
        this.activeSession.set(null);
        this.liveMovements.set([]);
        this.notificationService.success(`Caja ${closedSession.sessionNumber} cerrada definitivamente.`);
        this.switchTab('history');
      },
      error: (err) => {
        this.modalLoading.set(false);
        const msg = err?.error?.message || 'Error al cerrar la sesión de caja.';
        this.modalError.set(msg);
      }
    });
  }

  // Detalle histórico
  viewSessionDetail(session: CashRegisterSession): void {
    this.selectedHistorySession.set(session);
    this.showDetailModal.set(true);
  }
}
