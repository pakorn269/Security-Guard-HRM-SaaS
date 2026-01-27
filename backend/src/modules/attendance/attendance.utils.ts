/**
 * Calculate the distance between two geographic coordinates using the Haversine formula.
 *
 * The Haversine formula determines the great-circle distance between two points
 * on a sphere given their longitudes and latitudes.
 *
 * @param lat1 - Latitude of the first point (in decimal degrees)
 * @param lon1 - Longitude of the first point (in decimal degrees)
 * @param lat2 - Latitude of the second point (in decimal degrees)
 * @param lon2 - Longitude of the second point (in decimal degrees)
 * @returns Distance between the two points in meters
 */
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    // Earth's radius in meters
    const EARTH_RADIUS_METERS = 6371000;

    // Convert degrees to radians
    const toRadians = (degrees: number): number => degrees * (Math.PI / 180);

    const lat1Rad = toRadians(lat1);
    const lat2Rad = toRadians(lat2);
    const deltaLatRad = toRadians(lat2 - lat1);
    const deltaLonRad = toRadians(lon2 - lon1);

    // Haversine formula
    const a =
        Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
        Math.cos(lat1Rad) *
            Math.cos(lat2Rad) *
            Math.sin(deltaLonRad / 2) *
            Math.sin(deltaLonRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Distance in meters
    const distance = EARTH_RADIUS_METERS * c;

    return Math.round(distance); // Round to nearest meter
}
