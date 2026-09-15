import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserDetail, ResetUserPasswordRequest } from '../../../../core/models/user-admin.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';

@Component({
  selector: 'app-reset-password-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent],
  templateUrl: './reset-password-modal.component.html'
})
export class ResetPasswordModalComponent {
  @Input({ required: true }) user!: UserDetail;
  @Input() loading: any = false;

  @Output() save = new EventEmitter<{ id: number; request: ResetUserPasswordRequest }>();
  @Output() cancel = new EventEmitter<void>();

  form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  isLoading(): boolean {
    return typeof this.loading === 'function' ? this.loading() : !!this.loading;
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.save.emit({
      id: this.user.id,
      request: { newPassword: this.form.value.newPassword }
    });
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
