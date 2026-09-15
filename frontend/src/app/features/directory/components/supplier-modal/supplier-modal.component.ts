import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Supplier, CreateSupplierRequest } from '../../../../core/models/supplier.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';
import { emailFormatValidator } from '../../../../shared/validators';

@Component({
  selector: 'app-supplier-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent],
  templateUrl: './supplier-modal.component.html'
})
export class SupplierModalComponent implements OnInit {
  @Input() supplier: Supplier | null = null;
  @Input() loading = signal<boolean>(false);
  @Input() errorMessage = signal<string | null>(null);

  @Output() save = new EventEmitter<CreateSupplierRequest>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: [this.supplier?.name || '', [Validators.required, Validators.maxLength(150)]],
      taxId: [this.supplier?.taxId || '', [Validators.required, Validators.maxLength(30)]],
      contactName: [this.supplier?.contactName || '', [Validators.maxLength(100)]],
      email: [this.supplier?.email || '', [emailFormatValidator(), Validators.maxLength(150)]],
      phone: [this.supplier?.phone || '', [Validators.maxLength(30)]],
      address: [this.supplier?.address || '', [Validators.maxLength(300)]]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.save.emit(this.form.value);
  }
}
