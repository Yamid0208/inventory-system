import { describe, it, expect } from 'vitest';
import { ThousandsSeparatorPipe } from './thousands-separator.pipe';
import { formatThousands, parseThousands } from '../utils/number-format.util';

describe('ThousandsSeparatorPipe & number-format.util', () => {
  const pipe = new ThousandsSeparatorPipe();

  it('should format numbers with thousands separator (dots)', () => {
    expect(pipe.transform(1000)).toBe('1.000');
    expect(pipe.transform(15000)).toBe('15.000');
    expect(pipe.transform(2500000)).toBe('2.500.000');
  });

  it('should preserve decimal values with comma', () => {
    expect(pipe.transform(1250.5)).toBe('1.250,5');
    expect(pipe.transform('2500000.75')).toBe('2.500.000,75');
  });

  it('should handle zero, null, undefined and empty string properly', () => {
    expect(pipe.transform(0)).toBe('0');
    expect(pipe.transform(null)).toBe('0');
    expect(pipe.transform(undefined)).toBe('0');
    expect(pipe.transform('')).toBe('0');
  });

  it('should correctly parse thousands formatted strings back to pure numbers', () => {
    expect(parseThousands('1.000')).toBe(1000);
    expect(parseThousands('15.000')).toBe(15000);
    expect(parseThousands('2.500.000')).toBe(2500000);
    expect(parseThousands('1.250,5')).toBe(1250.5);
    expect(parseThousands(2500000)).toBe(2500000);
  });
});
