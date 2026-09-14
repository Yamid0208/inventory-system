import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="bg-white dark:bg-slate-900 border border-slate-100/90 dark:border-slate-800 rounded-3xl shadow-card hover:shadow-card-hover overflow-hidden transition-all duration-200">
      @if (title() || hasHeaderContent) {
        <header class="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            @if (title()) {
              <h3 class="text-base font-bold text-slate-900 dark:text-white tracking-tight">{{ title() }}</h3>
            }
            @if (subtitle()) {
              <p class="text-xs text-slate-400 font-medium mt-0.5">{{ subtitle() }}</p>
            }
          </div>
          <div class="flex items-center space-x-2">
            <ng-content select="[card-actions]"></ng-content>
          </div>
        </header>
      }

      <div class="p-6">
        <ng-content></ng-content>
      </div>

      <ng-content select="[card-footer]"></ng-content>
    </section>
  `
})
export class AppCardComponent {
  title = input<string>('');
  subtitle = input<string>('');
  hasHeaderContent = false;
}
