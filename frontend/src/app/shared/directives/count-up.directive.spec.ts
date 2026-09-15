import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ElementRef, NgZone, SimpleChange } from '@angular/core';
import { CountUpDirective } from './count-up.directive';

describe('CountUpDirective (Unit Tests)', () => {
  let mockElement: { textContent: string };
  let mockElementRef: ElementRef<HTMLElement>;
  let mockNgZone: NgZone;

  beforeEach(() => {
    mockElement = { textContent: '' };
    mockElementRef = { nativeElement: mockElement as unknown as HTMLElement };
    mockNgZone = {
      runOutsideAngular: (fn: () => void) => fn()
    } as unknown as NgZone;
  });

  it('should render target value immediately when duration is 0', () => {
    const directive = new CountUpDirective(mockElementRef, mockNgZone, 'browser');
    directive.endVal = 5000;
    directive.duration = 0;

    directive.ngOnInit();

    expect(mockElement.textContent).toBe('5.000');
  });

  it('should format with prefix and suffix', () => {
    const directive = new CountUpDirective(mockElementRef, mockNgZone, 'browser');
    directive.endVal = 1250000;
    directive.prefix = '$';
    directive.suffix = ' USD';
    directive.duration = 0;

    directive.ngOnInit();

    expect(mockElement.textContent).toBe('$1.250.000 USD');
  });

  it('should handle string numeric input and null safely', () => {
    const directive = new CountUpDirective(mockElementRef, mockNgZone, 'browser');
    directive.endVal = '2500';
    directive.duration = 0;

    directive.ngOnInit();
    expect(mockElement.textContent).toBe('2.500');

    directive.endVal = null;
    directive.ngOnChanges({
      endVal: new SimpleChange('2500', null, false)
    });
    expect(mockElement.textContent).toBe('0');
  });

  it('should restart animation when retrigger changes', () => {
    const directive = new CountUpDirective(mockElementRef, mockNgZone, 'browser');
    directive.endVal = 42;
    directive.duration = 0;
    directive.ngOnInit();
    expect(mockElement.textContent).toBe('42');

    directive.retrigger = 1;
    directive.ngOnChanges({
      retrigger: new SimpleChange(0, 1, false)
    });

    expect(mockElement.textContent).toBe('42');
  });

  it('should cleanup animation frame and timers on destroy', () => {
    const directive = new CountUpDirective(mockElementRef, mockNgZone, 'browser');
    directive.endVal = 100;
    directive.duration = 500;
    directive.delay = 100;
    directive.ngOnInit();

    expect(() => directive.ngOnDestroy()).not.toThrow();
  });
});
