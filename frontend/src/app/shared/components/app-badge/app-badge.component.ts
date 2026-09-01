import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="badgeClasses()">
      @if (dot()) {
        <span [class]="dotClasses()" aria-hidden="true"></span>
      }
      {{ label() }}
      <ng-content></ng-content>
    </span>
  `
})
export class AppBadgeComponent {
  variant = input<BadgeVariant>('neutral');
  label = input<string>('');
  dot = input<boolean>(true);

  badgeClasses = computed(() => {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border select-none';

    const variantStyles = {
      success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      info: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      neutral: 'bg-slate-500/10 text-slate-300 border-slate-500/20'
    }[this.variant()];

    return `${base} ${variantStyles}`;
  });

  dotClasses = computed(() => {
    const base = 'w-1.5 h-1.5 mr-1.5 rounded-full';
    const color = {
      success: 'bg-emerald-400',
      warning: 'bg-amber-400',
      danger: 'bg-rose-400',
      info: 'bg-sky-400',
      neutral: 'bg-slate-400'
    }[this.variant()];

    return `${base} ${color}`;
  });
}
