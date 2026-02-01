/**
 * Thai Date Formatting Utilities
 * Formats dates using Thai Buddhist Era (พ.ศ.) calendar
 */

import { isToday, isTomorrow, isYesterday, differenceInDays, parseISO, format } from 'date-fns';

/**
 * Format date in Thai Buddhist Era format
 *
 * @param date - Date string or Date object
 * @param short - Use short format (default: false)
 * @returns Formatted Thai date string
 *
 * Examples:
 * - short: "29 ม.ค. 69" (for tables)
 * - full: "29 มกราคม 2569" (for modals/headers)
 */
export function formatThaiDate(date: string | Date | null | undefined, short: boolean = false): string {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check if date is valid
  if (isNaN(dateObj.getTime())) return '-';

  try {
    if (short) {
      // Short format: "29 ม.ค. 69"
      return new Intl.DateTimeFormat('th-TH', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
      }).format(dateObj);
    } else {
      // Full format: "29 มกราคม 2569"
      return new Intl.DateTimeFormat('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(dateObj);
    }
  } catch (err) {
    console.error('Error formatting Thai date:', err);
    return '-';
  }
}

/**
 * Format date and time in Thai Buddhist Era format with time
 *
 * @param date - Date string or Date object
 * @param short - Use short format (default: false)
 * @returns Formatted Thai date-time string
 *
 * Examples:
 * - short: "29 ม.ค. 69 08:00 น." (for tables)
 * - full: "29 มกราคม 2569 08:00 น." (for modals/headers)
 */
export function formatThaiDateTime(date: string | Date | null | undefined, short: boolean = false): string {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check if date is valid
  if (isNaN(dateObj.getTime())) return '-';

  try {
    const dateFormat = short
      ? {
          day: 'numeric',
          month: 'short',
          year: '2-digit',
        }
      : {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        };

    const formattedDate = new Intl.DateTimeFormat('th-TH', dateFormat as Intl.DateTimeFormatOptions).format(dateObj);

    // Format time as "HH:mm น."
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    const formattedTime = `${hours}:${minutes} น.`;

    return `${formattedDate} ${formattedTime}`;
  } catch (err) {
    console.error('Error formatting Thai date-time:', err);
    return '-';
  }
}

/**
 * Format time only in Thai format
 *
 * @param date - Date string or Date object
 * @returns Formatted time string with "น." suffix
 *
 * Example: "08:00 น."
 */
export function formatThaiTime(date: string | Date | null | undefined): string {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check if date is valid
  if (isNaN(dateObj.getTime())) return '-';

  try {
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes} น.`;
  } catch (err) {
    console.error('Error formatting Thai time:', err);
    return '-';
  }
}

/**
 * Format relative date with natural language
 * @param date Date object or ISO string
 * @param locale Current locale ('th' or 'en')
 * @returns Natural language date string
 *
 * @example
 * formatRelative(new Date(), 'th') // "วันนี้"
 * formatRelative(tomorrow, 'th') // "พรุ่งนี้"
 * formatRelative(pastDate, 'th') // "เมื่อวาน" or "3 วันที่แล้ว"
 */
export function formatRelative(date: Date | string, locale: 'th' | 'en' = 'th'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();

  // Check for today, tomorrow, yesterday
  if (isToday(dateObj)) {
    return locale === 'th' ? 'วันนี้' : 'Today';
  }

  if (isTomorrow(dateObj)) {
    return locale === 'th' ? 'พรุ่งนี้' : 'Tomorrow';
  }

  if (isYesterday(dateObj)) {
    return locale === 'th' ? 'เมื่อวาน' : 'Yesterday';
  }

  // Calculate difference in days
  const days = differenceInDays(dateObj, now);

  // Future dates
  if (days > 0) {
    if (days === 2) {
      return locale === 'th' ? 'มะรืนนี้' : 'Day after tomorrow';
    }
    if (days <= 7) {
      return locale === 'th' ? `อีก ${days} วัน` : `In ${days} days`;
    }
    if (days <= 30) {
      const weeks = Math.floor(days / 7);
      return locale === 'th' ? `อีก ${weeks} สัปดาห์` : `In ${weeks} week${weeks > 1 ? 's' : ''}`;
    }
    const months = Math.floor(days / 30);
    return locale === 'th' ? `อีก ${months} เดือน` : `In ${months} month${months > 1 ? 's' : ''}`;
  }

  // Past dates
  const absDays = Math.abs(days);
  if (absDays === 2) {
    return locale === 'th' ? 'เมื่อวานซืน' : '2 days ago';
  }
  if (absDays <= 7) {
    return locale === 'th' ? `${absDays} วันที่แล้ว` : `${absDays} days ago`;
  }
  if (absDays <= 30) {
    const weeks = Math.floor(absDays / 7);
    return locale === 'th' ? `${weeks} สัปดาห์ที่แล้ว` : `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  const months = Math.floor(absDays / 30);
  return locale === 'th' ? `${months} เดือนที่แล้ว` : `${months} month${months > 1 ? 's' : ''} ago`;
}

/**
 * Calculate number of days between two dates
 * @param startDate Start date
 * @param endDate End date
 * @returns Number of days (inclusive)
 */
export function calculateDays(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

  return differenceInDays(end, start) + 1; // +1 to include both start and end dates
}

/**
 * Format date for input fields (YYYY-MM-DD)
 * @param date Date object or ISO string
 * @returns ISO date string
 */
export function formatDateForInput(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'yyyy-MM-dd');
}

/**
 * Format date range
 * @param startDate Start date
 * @param endDate End date
 * @param locale Current locale
 * @returns Formatted date range
 *
 * @example
 * formatDateRange('2026-02-15', '2026-02-17', 'th')
 * // "15-17 ก.พ. 2569"
 */
export function formatDateRange(
  startDate: Date | string,
  endDate: Date | string,
  locale: 'th' | 'en' = 'th',
  short: boolean = false
): string {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;

  const sameMonth = start.getMonth() === end.getMonth();
  const sameYear = start.getFullYear() === end.getFullYear();

  if (sameYear && sameMonth) {
    // Same month and year: "15-17 Feb 2026"
    const startDay = start.getDate();
    const endFormatted = locale === 'th'
      ? formatThaiDate(end, short)
      : format(end, short ? 'dd MMM yy' : 'dd MMM yyyy');

    return `${startDay}-${endFormatted}`;
  } else if (sameYear) {
    // Same year: "15 Feb - 17 Mar 2026"
    const startFormatted = locale === 'th'
      ? formatThaiDate(start, short).replace(/\s\d{2,4}$/, '')
      : format(start, 'dd MMM');
    const endFormatted = locale === 'th'
      ? formatThaiDate(end, short)
      : format(end, short ? 'dd MMM yy' : 'dd MMM yyyy');

    return `${startFormatted} - ${endFormatted}`;
  } else {
    // Different years: "15 Feb 2026 - 17 Mar 2027"
    const startFormatted = locale === 'th'
      ? formatThaiDate(start, short)
      : format(start, short ? 'dd MMM yy' : 'dd MMM yyyy');
    const endFormatted = locale === 'th'
      ? formatThaiDate(end, short)
      : format(end, short ? 'dd MMM yy' : 'dd MMM yyyy');

    return `${startFormatted} - ${endFormatted}`;
  }
}
