/**
 * Number Formatting Utilities for Thai/English Localization
 */

/**
 * Thai numerals (๐-๙)
 */
const THAI_NUMERALS = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];

/**
 * Convert Arabic numerals (0-9) to Thai numerals (๐-๙)
 * @param num Number or string to convert
 * @returns String with Thai numerals
 *
 * @example
 * formatThaiNumber(123) // "๑๒๓"
 * formatThaiNumber("2026") // "๒๐๒๖"
 */
export function formatThaiNumber(num: number | string): string {
  const str = num.toString();
  return str.replace(/\d/g, (digit) => THAI_NUMERALS[parseInt(digit, 10)]);
}

/**
 * Convert Thai numerals (๐-๙) to Arabic numerals (0-9)
 * @param str String with Thai numerals
 * @returns String with Arabic numerals
 *
 * @example
 * parseThaiNumber("๑๒๓") // "123"
 */
export function parseThaiNumber(str: string): string {
  return str.replace(/[๐-๙]/g, (thaiDigit) => {
    const index = THAI_NUMERALS.indexOf(thaiDigit);
    return index.toString();
  });
}

/**
 * Format number with comma separators
 * @param num Number to format
 * @param locale Current locale
 * @returns Formatted number string
 *
 * @example
 * formatNumber(1234567, 'en') // "1,234,567"
 * formatNumber(1234567, 'th') // "1,234,567"
 */
export function formatNumber(num: number, locale: 'th' | 'en' = 'en'): string {
  return new Intl.NumberFormat(locale === 'th' ? 'th-TH' : 'en-US').format(num);
}

/**
 * Format currency (Thai Baht)
 * @param amount Amount to format
 * @param locale Current locale
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56, 'th') // "฿1,234.56"
 * formatCurrency(1234.56, 'en') // "฿1,234.56"
 */
export function formatCurrency(amount: number, locale: 'th' | 'en' = 'th'): string {
  return new Intl.NumberFormat(locale === 'th' ? 'th-TH' : 'en-US', {
    style: 'currency',
    currency: 'THB',
  }).format(amount);
}

/**
 * Format decimal number
 * @param num Number to format
 * @param decimals Number of decimal places (default: 1)
 * @param locale Current locale
 * @returns Formatted number string
 *
 * @example
 * formatDecimal(2.5, 1, 'en') // "2.5"
 * formatDecimal(2.567, 2, 'en') // "2.57"
 */
export function formatDecimal(
  num: number,
  decimals: number = 1,
  locale: 'th' | 'en' = 'en'
): string {
  return new Intl.NumberFormat(locale === 'th' ? 'th-TH' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format percentage
 * @param value Decimal value (0-1)
 * @param locale Current locale
 * @returns Formatted percentage string
 *
 * @example
 * formatPercentage(0.75, 'en') // "75%"
 * formatPercentage(0.856, 'en') // "85.6%"
 */
export function formatPercentage(value: number, locale: 'th' | 'en' = 'en'): string {
  return new Intl.NumberFormat(locale === 'th' ? 'th-TH' : 'en-US', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Format compact number (K, M, B)
 * @param num Number to format
 * @param locale Current locale
 * @returns Compact number string
 *
 * @example
 * formatCompactNumber(1500, 'en') // "1.5K"
 * formatCompactNumber(1500000, 'en') // "1.5M"
 */
export function formatCompactNumber(num: number, locale: 'th' | 'en' = 'en'): string {
  return new Intl.NumberFormat(locale === 'th' ? 'th-TH' : 'en-US', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(num);
}
