import { calculateDistance } from './attendance.utils';

/**
 * Test cases for the Haversine distance calculation
 * These tests demonstrate the accuracy of the formula with real-world examples
 */

describe('calculateDistance', () => {
    it('should calculate distance between two close points (Bangkok)', () => {
        // Siam Paragon to MBK Center (approximately 500 meters)
        const siamParagon = { lat: 13.7465, lng: 100.5348 };
        const mbkCenter = { lat: 13.7443, lng: 100.5298 };

        const distance = calculateDistance(
            siamParagon.lat,
            siamParagon.lng,
            mbkCenter.lat,
            mbkCenter.lng
        );

        // Should be approximately 500 meters (allowing 150m margin due to actual great circle distance of ~593m)
        expect(distance).toBeGreaterThan(450);
        expect(distance).toBeLessThan(650);
    });

    it('should return 0 for the same location', () => {
        const lat = 13.7465;
        const lng = 100.5348;

        const distance = calculateDistance(lat, lng, lat, lng);

        expect(distance).toBe(0);
    });

    it('should calculate long distances accurately (Bangkok to Chiang Mai)', () => {
        // Bangkok (approximately)
        const bangkok = { lat: 13.7563, lng: 100.5018 };
        // Chiang Mai (approximately)
        const chiangMai = { lat: 18.7883, lng: 98.9853 };

        const distance = calculateDistance(
            bangkok.lat,
            bangkok.lng,
            chiangMai.lat,
            chiangMai.lng
        );

        // Distance should be approximately 580-600 km
        expect(distance).toBeGreaterThan(580000);
        expect(distance).toBeLessThan(600000);
    });

    it('should handle negative coordinates (testing different hemispheres)', () => {
        // New York
        const newYork = { lat: 40.7128, lng: -74.006 };
        // London
        const london = { lat: 51.5074, lng: -0.1278 };

        const distance = calculateDistance(
            newYork.lat,
            newYork.lng,
            london.lat,
            london.lng
        );

        // Distance should be approximately 5,570 km
        expect(distance).toBeGreaterThan(5500000);
        expect(distance).toBeLessThan(5600000);
    });

    it('should validate geofence correctly (within 100m radius)', () => {
        // Site center
        const siteCenter = { lat: 13.7465, lng: 100.5348 };
        const radius = 100; // 100 meters

        // User location 50 meters away (approximate)
        const userLocation = { lat: 13.7469, lng: 100.5348 };

        const distance = calculateDistance(
            siteCenter.lat,
            siteCenter.lng,
            userLocation.lat,
            userLocation.lng
        );

        // Should be within radius
        expect(distance).toBeLessThanOrEqual(radius);
    });

    it('should validate geofence correctly (outside 100m radius)', () => {
        // Site center
        const siteCenter = { lat: 13.7465, lng: 100.5348 };
        const radius = 100; // 100 meters

        // User location 200 meters away (approximate)
        const userLocation = { lat: 13.7483, lng: 100.5348 };

        const distance = calculateDistance(
            siteCenter.lat,
            siteCenter.lng,
            userLocation.lat,
            userLocation.lng
        );

        // Should be outside radius
        expect(distance).toBeGreaterThan(radius);
    });
});

/**
 * Example usage demonstrating the validation logic
 */
console.log('\n=== Haversine Distance Calculation Examples ===\n');

// Example 1: Close distance
const site1 = { lat: 13.7465, lng: 100.5348, radius: 100 };
const user1 = { lat: 13.7469, lng: 100.5348 };
const distance1 = calculateDistance(site1.lat, site1.lng, user1.lat, user1.lng);
console.log('Example 1 - Within Geofence:');
console.log(`  Site: (${site1.lat}, ${site1.lng}), Radius: ${site1.radius}m`);
console.log(`  User: (${user1.lat}, ${user1.lng})`);
console.log(`  Distance: ${distance1}m`);
console.log(`  Is Inside: ${distance1 <= site1.radius ? 'YES ✓' : 'NO ✗'}\n`);

// Example 2: Outside geofence
const site2 = { lat: 13.7465, lng: 100.5348, radius: 100 };
const user2 = { lat: 13.7483, lng: 100.5348 };
const distance2 = calculateDistance(site2.lat, site2.lng, user2.lat, user2.lng);
console.log('Example 2 - Outside Geofence:');
console.log(`  Site: (${site2.lat}, ${site2.lng}), Radius: ${site2.radius}m`);
console.log(`  User: (${user2.lat}, ${user2.lng})`);
console.log(`  Distance: ${distance2}m`);
console.log(`  Is Inside: ${distance2 <= site2.radius ? 'YES ✓' : 'NO ✗'}\n`);

// Example 3: Longer distance
const site3 = { lat: 13.7563, lng: 100.5018 };
const user3 = { lat: 13.7443, lng: 100.5298 };
const distance3 = calculateDistance(site3.lat, site3.lng, user3.lat, user3.lng);
console.log('Example 3 - Long Distance:');
console.log(`  Site: (${site3.lat}, ${site3.lng})`);
console.log(`  User: (${user3.lat}, ${user3.lng})`);
console.log(`  Distance: ${distance3}m (${(distance3 / 1000).toFixed(2)}km)\n`);
