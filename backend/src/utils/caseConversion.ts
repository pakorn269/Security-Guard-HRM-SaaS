/**
 * Convert string to camelCase
 */
export function toCamelCase(str: string): string {
    return str.replace(/([-_][a-z])/ig, ($1) => {
        return $1.toUpperCase()
            .replace('-', '')
            .replace('_', '');
    });
}

/**
 * Convert string to snake_case
 */
export function toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Recalculate object keys to camelCase
 */
export function toCamelCaseKeys(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(v => toCamelCaseKeys(v));
    } else if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce(
            (result, key) => ({
                ...result,
                [toCamelCase(key)]: toCamelCaseKeys(obj[key]),
            }),
            {},
        );
    }
    return obj;
}

/**
 * Recalculate object keys to snake_case
 */
export function toSnakeCaseKeys(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(v => toSnakeCaseKeys(v));
    } else if (obj !== null && obj.constructor === Object) {
        return Object.keys(obj).reduce(
            (result, key) => ({
                ...result,
                [toSnakeCase(key)]: toSnakeCaseKeys(obj[key]),
            }),
            {},
        );
    }
    return obj;
}
