import {
  Directive,
  ElementRef,
  Inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  SimpleChanges
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { formatThousands, parseThousands } from '../utils/number-format.util';

@Directive({
  selector: '[appCountUp]',
  standalone: true
})
export class CountUpDirective implements OnInit, OnChanges, OnDestroy {
  @Input('appCountUp') endVal: number | string | null | undefined = 0;
  @Input() startVal: number = 0;
  @Input() duration: number = 1000;
  @Input() prefix: string = '';
  @Input() suffix: string = '';
  @Input() decimals: number = 0;
  @Input() useGrouping: boolean = true;
  @Input() delay: number = 0;
  @Input() retrigger: unknown = null;

  private animationFrameId: number | null = null;
  private delayTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isBrowser: boolean;
  private currentValue: number = 0;

  constructor(
    private el: ElementRef<HTMLElement>,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.currentValue = this.startVal;
    this.startAnimation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Si ya inicializó y cambió el valor o el token de retrigger, animar nuevamente
    if (changes['endVal'] && !changes['endVal'].isFirstChange()) {
      this.startAnimation();
    } else if (changes['retrigger'] && !changes['retrigger'].isFirstChange()) {
      this.startAnimation();
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.delayTimeoutId !== null) {
      clearTimeout(this.delayTimeoutId);
      this.delayTimeoutId = null;
    }
  }

  private getNumericTarget(): number {
    if (this.endVal === null || this.endVal === undefined || this.endVal === '') {
      return 0;
    }
    if (typeof this.endVal === 'number') {
      return isNaN(this.endVal) ? 0 : this.endVal;
    }
    return parseThousands(this.endVal);
  }

  private startAnimation(): void {
    this.cleanup();

    const targetVal = this.getNumericTarget();

    if (!this.isBrowser) {
      this.render(targetVal);
      return;
    }

    // Respetar preferencias de reducción de movimiento
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || this.duration <= 0) {
      this.render(targetVal);
      this.currentValue = targetVal;
      return;
    }

    const fromVal = this.startVal;
    const dur = Math.max(100, this.duration);

    const run = () => {
      this.ngZone.runOutsideAngular(() => {
        const startTime = performance.now();

        // Curva Quartic Ease-Out: arranque veloz y asentamiento suave
        const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

        const frame = (currentTime: number) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / dur, 1);
          const easedProgress = easeOutQuart(progress);

          const value = fromVal + (targetVal - fromVal) * easedProgress;
          this.render(value);

          if (progress < 1) {
            this.animationFrameId = requestAnimationFrame(frame);
          } else {
            this.render(targetVal);
            this.currentValue = targetVal;
            this.animationFrameId = null;
          }
        };

        this.animationFrameId = requestAnimationFrame(frame);
      });
    };

    if (this.delay > 0) {
      this.delayTimeoutId = setTimeout(run, this.delay);
    } else {
      run();
    }
  }

  private render(value: number): void {
    let formatted: string;

    if (this.decimals > 0) {
      const fixed = Number(value.toFixed(this.decimals));
      formatted = this.useGrouping
        ? formatThousands(fixed, { preserveDecimals: true, maxDecimals: this.decimals })
        : fixed.toFixed(this.decimals);
    } else {
      const rounded = Math.round(value);
      formatted = this.useGrouping
        ? formatThousands(rounded, { preserveDecimals: false })
        : rounded.toString();
    }

    const output = `${this.prefix}${formatted}${this.suffix}`;
    this.el.nativeElement.textContent = output;
  }
}
