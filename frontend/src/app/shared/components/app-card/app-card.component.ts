import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-card.component.html'
})
export class AppCardComponent {
  title = input<string>('');
  subtitle = input<string>('');
  hasHeaderContent = false;
}
