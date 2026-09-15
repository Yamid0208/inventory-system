import { describe, it, expect } from 'vitest';
import { CurrencyFormatPipe } from './currency-format.pipe';

describe('CurrencyFormatPipe (Unit Tests)', () => {
  const pipe = new CurrencyFormatPipe();

  it('should format numeric amount correctly with thousands dot', () => {
    const formatted = pipe.transform(1250);
    expect(formatted).toBe('$1.250');
    expect(pipe.transform(2500000)).toBe('$2.500.000');
  });

  it('should format string numbers properly with thousands dot', () => {
    const formatted = pipe.transform('9900');
    expect(formatted).toBe('$9.900');
  });

  it('should return default zero format when null or empty', () => {
    expect(pipe.transform(null)).toBe('$0');
    expect(pipe.transform('')).toBe('$0');
    expect(pipe.transform(undefined)).toBe('$0');
  });
});
