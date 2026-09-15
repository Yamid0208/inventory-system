import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-form-field.component.html'
})
export class AppFormFieldComponent {
  @Input() label?: string;
  @Input() forId?: string;
  @Input() required = false;
  @Input() hint?: string;
  @Input() error?: string | null = null;
}
