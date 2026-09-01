import { describe, it, expect } from 'vitest';
import { CurrencyFormatPipe } from './currency-format.pipe';

describe('CurrencyFormatPipe (Unit Tests)', () => {
  const pipe = new CurrencyFormatPipe();

  it('should format numeric amount correctly to USD', () => {
    const formatted = pipe.transform(1250.5);
    expect(formatted).toContain('$1,250.50');
  });

  it('should format string numbers properly', () => {
    const formatted = pipe.transform('99.99');
    expect(formatted).toContain('$99.99');
  });

  it('should return default zero format when null or empty', () => {
    expect(pipe.transform(null)).toBe('$0.00 USD');
    expect(pipe.transform('')).toBe('$0.00 USD');
    expect(pipe.transform(undefined)).toBe('$0.00 USD');
  });
});
