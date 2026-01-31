/**
 * Thai Date Formatting Utilities
 * Formats dates using Thai Buddhist Era (พ.ศ.) calendar
 */

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
