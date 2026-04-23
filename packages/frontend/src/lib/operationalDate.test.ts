import { describe, it, expect } from 'vitest';
import {
  isEarlyMorning,
  getOperationalDate,
  getOperationalDateString,
  formatOperationalDate,
  getCalendarDateString,
} from './operationalDate';

describe('operationalDate', () => {
  describe('isEarlyMorning', () => {
    it('returns true for 00:00', () => {
      expect(isEarlyMorning(new Date('2025-06-15T00:00:00'))).toBe(true);
    });

    it('returns true for 03:30', () => {
      expect(isEarlyMorning(new Date('2025-06-15T03:30:00'))).toBe(true);
    });

    it('returns true for 04:59', () => {
      expect(isEarlyMorning(new Date('2025-06-15T04:59:00'))).toBe(true);
    });

    it('returns false for 05:00 (cutoff hour)', () => {
      expect(isEarlyMorning(new Date('2025-06-15T05:00:00'))).toBe(false);
    });

    it('returns false for 12:00', () => {
      expect(isEarlyMorning(new Date('2025-06-15T12:00:00'))).toBe(false);
    });

    it('returns false for 23:59', () => {
      expect(isEarlyMorning(new Date('2025-06-15T23:59:00'))).toBe(false);
    });
  });

  describe('getOperationalDate', () => {
    it('returns previous day at 2:00 AM', () => {
      const date = new Date('2025-06-15T02:00:00');
      const operational = getOperationalDate(date);
      expect(operational.getDate()).toBe(14);
    });

    it('returns same day at 10:00 AM', () => {
      const date = new Date('2025-06-15T10:00:00');
      const operational = getOperationalDate(date);
      expect(operational.getDate()).toBe(15);
    });

    it('returns same day at 05:00 AM (exact cutoff)', () => {
      const date = new Date('2025-06-15T05:00:00');
      const operational = getOperationalDate(date);
      expect(operational.getDate()).toBe(15);
    });
  });

  describe('getOperationalDateString', () => {
    it('returns previous day string at 1:30 AM', () => {
      const date = new Date('2025-06-15T01:30:00');
      expect(getOperationalDateString(date)).toBe('2025-06-14');
    });

    it('returns same day string at 18:00', () => {
      const date = new Date('2025-06-15T18:00:00');
      expect(getOperationalDateString(date)).toBe('2025-06-15');
    });
  });

  describe('formatOperationalDate', () => {
    it('appends (cierre) during early morning hours', () => {
      const date = new Date('2025-06-15T02:00:00');
      const formatted = formatOperationalDate(date);
      expect(formatted).toContain('(cierre)');
    });

    it('does not append (cierre) during normal hours', () => {
      const date = new Date('2025-06-15T14:00:00');
      const formatted = formatOperationalDate(date);
      expect(formatted).not.toContain('(cierre)');
    });
  });

  describe('getCalendarDateString', () => {
    it('always returns the actual calendar date regardless of time', () => {
      const earlyMorning = new Date('2025-06-15T02:00:00');
      expect(getCalendarDateString(earlyMorning)).toBe('2025-06-15');
    });
  });
});
