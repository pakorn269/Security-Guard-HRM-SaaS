/**
 * Date formatting utilities with Thai Buddhist Era (พ.ศ.) support
 */

// Thai month names (short)
const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

// Thai month names (full)
const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

// Thai day names (short)
const THAI_DAYS_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

// Thai day names (full)
const THAI_DAYS_FULL = [
  'อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'
];

/**
 * Convert Gregorian year to Buddhist Era year
 * Buddhist Era = Gregorian Year + 543
 */
export function toBuddhistYear(gregorianYear: number): number {
  return gregorianYear + 543;
}

/**
 * Format date in Thai format with Buddhist Era
 *
 * @param dateStr - ISO date string or Date object
 * @param format - Format style: 'short', 'medium', 'long', 'full'
 * @returns Formatted Thai date string
 *
 * Examples:
 * - short: "29 ม.ค. 67"
 * - medium: "29 ม.ค. 2567"
 * - long: "29 มกราคม 2567"
 * - full: "วันจันทร์ที่ 29 มกราคม พ.ศ. 2567"
 */
export function formatThaiDate(
  dateStr: string | Date | null | undefined,
  format: 'short' | 'medium' | 'long' | 'full' = 'medium'
): string {
  if (!dateStr) return '-';

  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;

  // Check if date is valid
  if (isNaN(date.getTime())) return '-';

  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  const buddhistYear = toBuddhistYear(year);
  const dayOfWeek = date.getDay();

  switch (format) {
    case 'short':
      // "29 ม.ค. 67"
      return `${day} ${THAI_MONTHS_SHORT[month]} ${buddhistYear.toString().slice(-2)}`;

    case 'medium':
      // "29 ม.ค. 2567"
      return `${day} ${THAI_MONTHS_SHORT[month]} ${buddhistYear}`;

    case 'long':
      // "29 มกราคม 2567"
      return `${day} ${THAI_MONTHS_FULL[month]} ${buddhistYear}`;

    case 'full':
      // "วันจันทร์ที่ 29 มกราคม พ.ศ. 2567"
      return `วัน${THAI_DAYS_FULL[dayOfWeek]}ที่ ${day} ${THAI_MONTHS_FULL[month]} พ.ศ. ${buddhistYear}`;

    default:
      return `${day} ${THAI_MONTHS_SHORT[month]} ${buddhistYear}`;
  }
}

/**
 * Format time in Thai format (24-hour)
 *
 * @param timeStr - ISO time string or Date object
 * @param includeSeconds - Include seconds in output
 * @returns Formatted time string
 *
 * Examples:
 * - "08:30 น."
 * - "14:45:30 น."
 */
export function formatThaiTime(
  timeStr: string | Date | null | undefined,
  includeSeconds: boolean = false
): string {
  if (!timeStr) return '-';

  const date = typeof timeStr === 'string' ? new Date(timeStr) : timeStr;

  // Check if date is valid
  if (isNaN(date.getTime())) return '-';

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  if (includeSeconds) {
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds} น.`;
  }

  return `${hours}:${minutes} น.`;
}

/**
 * Format date and time in Thai format
 *
 * @param dateStr - ISO date-time string or Date object
 * @param dateFormat - Date format style
 * @param includeSeconds - Include seconds in time
 * @returns Formatted Thai date-time string
 *
 * Examples:
 * - "29 ม.ค. 2567 เวลา 08:30 น."
 * - "29 มกราคม 2567 เวลา 14:45:30 น."
 */
export function formatThaiDateTime(
  dateStr: string | Date | null | undefined,
  dateFormat: 'short' | 'medium' | 'long' | 'full' = 'medium',
  includeSeconds: boolean = false
): string {
  if (!dateStr) return '-';

  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;

  // Check if date is valid
  if (isNaN(date.getTime())) return '-';

  const formattedDate = formatThaiDate(date, dateFormat);
  const formattedTime = formatThaiTime(date, includeSeconds);

  return `${formattedDate} เวลา ${formattedTime}`;
}

/**
 * Format date range in Thai format
 *
 * @param startDate - Start date
 * @param endDate - End date
 * @param format - Date format style
 * @returns Formatted date range string
 *
 * Examples:
 * - "29 ม.ค. 2567 - 31 ม.ค. 2567"
 * - "29 มกราคม - 5 กุมภาพันธ์ 2567" (same year)
 */
export function formatThaiDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
  format: 'short' | 'medium' | 'long' = 'medium'
): string {
  if (!startDate || !endDate) return '-';

  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  // Check if dates are valid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '-';

  // If same date, return single date
  if (start.toDateString() === end.toDateString()) {
    return formatThaiDate(start, format);
  }

  // If same year, optimize format
  if (start.getFullYear() === end.getFullYear()) {
    const startDay = start.getDate();
    const startMonth = start.getMonth();
    const endDay = end.getDate();
    const endMonth = end.getMonth();
    const buddhistYear = toBuddhistYear(end.getFullYear());

    if (format === 'short') {
      return `${startDay} ${THAI_MONTHS_SHORT[startMonth]} - ${endDay} ${THAI_MONTHS_SHORT[endMonth]} ${buddhistYear.toString().slice(-2)}`;
    } else if (format === 'long') {
      return `${startDay} ${THAI_MONTHS_FULL[startMonth]} - ${endDay} ${THAI_MONTHS_FULL[endMonth]} ${buddhistYear}`;
    } else {
      return `${startDay} ${THAI_MONTHS_SHORT[startMonth]} - ${endDay} ${THAI_MONTHS_SHORT[endMonth]} ${buddhistYear}`;
    }
  }

  // Different years
  return `${formatThaiDate(start, format)} - ${formatThaiDate(end, format)}`;
}

/**
 * Get Thai day name from date
 *
 * @param dateStr - ISO date string or Date object
 * @param short - Use short format
 * @returns Thai day name
 *
 * Examples:
 * - short: "จ.", "อ.", "พ."
 * - full: "จันทร์", "อังคาร", "พุธ"
 */
export function getThaiDayName(
  dateStr: string | Date | null | undefined,
  short: boolean = false
): string {
  if (!dateStr) return '-';

  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;

  // Check if date is valid
  if (isNaN(date.getTime())) return '-';

  const dayOfWeek = date.getDay();
  return short ? THAI_DAYS_SHORT[dayOfWeek] : THAI_DAYS_FULL[dayOfWeek];
}

/**
 * Format relative date in Thai (e.g., "วันนี้", "เมื่อวาน", "พรุ่งนี้")
 *
 * @param dateStr - ISO date string or Date object
 * @returns Thai relative date string
 *
 * Examples:
 * - "วันนี้" (today)
 * - "เมื่อวาน" (yesterday)
 * - "พรุ่งนี้" (tomorrow)
 * - "2 วันที่แล้ว" (2 days ago)
 * - "ใน 3 วัน" (in 3 days)
 */
export function formatThaiRelativeDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '-';

  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;

  // Check if date is valid
  if (isNaN(date.getTime())) return '-';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'วันนี้';
  if (diffDays === -1) return 'เมื่อวาน';
  if (diffDays === 1) return 'พรุ่งนี้';
  if (diffDays === -2) return 'เมื่อวานซืน';
  if (diffDays === 2) return 'มะรืนนี้';

  if (diffDays < 0) {
    return `${Math.abs(diffDays)} วันที่แล้ว`;
  } else {
    return `ใน ${diffDays} วัน`;
  }
}

/**
 * Format duration in Thai
 *
 * @param hours - Number of hours
 * @returns Formatted duration string
 *
 * Examples:
 * - "8 ชั่วโมง"
 * - "8.5 ชั่วโมง"
 * - "0.5 ชั่วโมง" (30 minutes)
 */
export function formatThaiDuration(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return '-';

  if (hours === 0) return '0 ชั่วโมง';

  // If less than 1 hour, show minutes
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} นาที`;
  }

  // Show hours with 1 decimal place if needed
  const roundedHours = Math.round(hours * 10) / 10;
  return `${roundedHours} ชั่วโมง`;
}
