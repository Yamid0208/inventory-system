import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Category, CreateCategoryRequest } from '../../../../core/models/category.model';
import { AppButtonComponent } from '../../../../shared/components/app-button/app-button.component';

@Component({
  selector: 'app-category-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AppButtonComponent],
  templateUrl: './category-modal.component.html'
})
export class CategoryModalComponent implements OnInit {
  @Input() category: Category | null = null;
  @Input() loading = signal<boolean>(false);
  @Input() errorMessage = signal<string | null>(null);

  @Output() save = new EventEmitter<CreateCategoryRequest>();
  @Output() cancel = new EventEmitter<void>();

  form!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: [this.category?.name || '', [Validators.required, Validators.maxLength(100)]],
      description: [this.category?.description || '', [Validators.maxLength(500)]]
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
