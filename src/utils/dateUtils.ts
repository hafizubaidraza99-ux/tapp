/**
 * Utilities for formatting and comparing dates in a specific school's timezone.
 * Uses native Intl.DateTimeFormat to avoid external heavy dependencies.
 */

export function getTodayDateString(timezone: string = 'UTC'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

export function getCurrentSchoolTime(timezone: string = 'UTC'): { timeString: string; hours: number; minutes: number } {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const hourPart = parts.find((p) => p.type === 'hour')?.value || '00';
    const minutePart = parts.find((p) => p.type === 'minute')?.value || '00';
    const hours = parseInt(hourPart, 10);
    const minutes = parseInt(minutePart, 10);
    return {
      timeString: `${hourPart.padStart(2, '0')}:${minutePart.padStart(2, '0')}`,
      hours,
      minutes,
    };
  } catch {
    const now = new Date();
    return {
      timeString: `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`,
      hours: now.getUTCHours(),
      minutes: now.getUTCMinutes(),
    };
  }
}

export function getDayOfWeekInTimezone(timezone: string = 'UTC'): number {
  try {
    // en-US gives Sunday as 1st day or weekday long
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    });
    const dayStr = formatter.format(new Date());
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return map[dayStr] ?? new Date().getDay();
  } catch {
    return new Date().getDay();
  }
}

export function formatFriendlyDate(dateStr: string, timezone: string = 'UTC'): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(dateObj);
  } catch {
    return dateStr;
  }
}

/**
 * Checks if the current time in the school's timezone has passed the cutoff time.
 * @param cutoffTime string in "HH:MM" format (e.g. "08:00")
 * @param timezone string school timezone (e.g. "Asia/Karachi", "UTC")
 */
export function isCutoffPassed(cutoffTime: string = '08:00', timezone: string = 'UTC'): {
  passed: boolean;
  minutesRemaining: number;
  cutoffFormatted: string;
  currentTimeFormatted: string;
} {
  const current = getCurrentSchoolTime(timezone);
  const [cutoffH, cutoffM] = (cutoffTime || '08:00').split(':').map((v) => parseInt(v, 10) || 0);

  const currentTotalMinutes = current.hours * 60 + current.minutes;
  const cutoffTotalMinutes = cutoffH * 60 + cutoffM;

  const passed = currentTotalMinutes >= cutoffTotalMinutes;
  const minutesRemaining = Math.max(0, cutoffTotalMinutes - currentTotalMinutes);

  return {
    passed,
    minutesRemaining,
    cutoffFormatted: `${String(cutoffH).padStart(2, '0')}:${String(cutoffM).padStart(2, '0')}`,
    currentTimeFormatted: current.timeString,
  };
}
