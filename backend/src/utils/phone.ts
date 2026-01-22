export class PhoneUtils {
    /**
     * Normalize phone number to consistent format (no spaces, dashes, etc.)
     * Handles Thai phone numbers specifically (08XXXXYYYY -> 08XXXXYYYY)
     * Handles +66 prefixes
     */
    static normalize(phone: string): string {
        if (!phone) return '';

        // Remove all non-digit characters
        let cleaned = phone.replace(/\D/g, '');

        // Handle Thailand country code
        if (cleaned.startsWith('66')) {
            cleaned = '0' + cleaned.substring(2);
        }

        // Handle leading + sign if it wasn't stripped (though \D strips it)
        // If someone passes "+66...", \D makes it "66..."

        return cleaned;
    }

    /**
     * Format phone number for display (e.g. 081-234-5678)
     */
    static format(phone: string): string {
        const cleaned = this.normalize(phone);

        if (cleaned.length === 10) {
            return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
        }

        if (cleaned.length === 9) {
            return `${cleaned.substring(0, 2)}-${cleaned.substring(2, 5)}-${cleaned.substring(5)}`;
        }

        return cleaned;
    }

    /**
     * Validate Thai phone number format
     */
    static isValidThaiPhone(phone: string): boolean {
        const cleaned = this.normalize(phone);
        // Mobile: 06, 08, 09 (10 digits)
        // Landline: 02, 03, 04, 05, 07 (9 digits)
        return /^0[23456789]\d{7,8}$/.test(cleaned);
    }
}
