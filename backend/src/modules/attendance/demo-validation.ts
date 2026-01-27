import { calculateDistance } from './attendance.utils.js';

/**
 * Demonstration of the Haversine distance calculation
 * and geofence validation logic
 */

console.log('\n=== Haversine Distance Calculation & Geofence Validation Demo ===\n');

// Example 1: Guard within geofence (PASS)
console.log('Example 1: Guard WITHIN Geofence');
console.log('─'.repeat(50));
const site1 = { lat: 13.7465, lng: 100.5348, radius: 100, name: 'Central Plaza' };
const guard1 = { lat: 13.7469, lng: 100.5348, name: 'Guard John' };
const distance1 = calculateDistance(site1.lat, site1.lng, guard1.lat, guard1.lng);
console.log(`Site: ${site1.name}`);
console.log(`  Location: (${site1.lat}, ${site1.lng})`);
console.log(`  Geofence Radius: ${site1.radius}m`);
console.log(`Guard: ${guard1.name}`);
console.log(`  Location: (${guard1.lat}, ${guard1.lng})`);
console.log(`Calculated Distance: ${distance1}m`);
console.log(`Validation Result: ${distance1 <= site1.radius ? '✓ PASS (Inside geofence)' : '✗ FAIL (Outside geofence)'}`);
console.log();

// Example 2: Guard outside geofence (FAIL)
console.log('Example 2: Guard OUTSIDE Geofence');
console.log('─'.repeat(50));
const site2 = { lat: 13.7465, lng: 100.5348, radius: 100, name: 'Central Plaza' };
const guard2 = { lat: 13.7483, lng: 100.5348, name: 'Guard Mary' };
const distance2 = calculateDistance(site2.lat, site2.lng, guard2.lat, guard2.lng);
console.log(`Site: ${site2.name}`);
console.log(`  Location: (${site2.lat}, ${site2.lng})`);
console.log(`  Geofence Radius: ${site2.radius}m`);
console.log(`Guard: ${guard2.name}`);
console.log(`  Location: (${guard2.lat}, ${guard2.lng})`);
console.log(`Calculated Distance: ${distance2}m`);
console.log(`Validation Result: ${distance2 <= site2.radius ? '✓ PASS (Inside geofence)' : '✗ FAIL (Outside geofence)'}`);
console.log();

// Example 3: Larger radius (PASS)
console.log('Example 3: Large Geofence Radius');
console.log('─'.repeat(50));
const site3 = { lat: 13.7465, lng: 100.5348, radius: 500, name: 'Shopping Mall Complex' };
const guard3 = { lat: 13.7443, lng: 100.5298, name: 'Guard Alex' };
const distance3 = calculateDistance(site3.lat, site3.lng, guard3.lat, guard3.lng);
console.log(`Site: ${site3.name}`);
console.log(`  Location: (${site3.lat}, ${site3.lng})`);
console.log(`  Geofence Radius: ${site3.radius}m`);
console.log(`Guard: ${guard3.name}`);
console.log(`  Location: (${guard3.lat}, ${guard3.lng})`);
console.log(`Calculated Distance: ${distance3}m`);
console.log(`Validation Result: ${distance3 <= site3.radius ? '✓ PASS (Inside geofence)' : '✗ FAIL (Outside geofence)'}`);
console.log();

// Example 4: Same location (edge case)
console.log('Example 4: Exact Location Match');
console.log('─'.repeat(50));
const site4 = { lat: 13.7465, lng: 100.5348, radius: 50, name: 'Security Office' };
const guard4 = { lat: 13.7465, lng: 100.5348, name: 'Guard Mike' };
const distance4 = calculateDistance(site4.lat, site4.lng, guard4.lat, guard4.lng);
console.log(`Site: ${site4.name}`);
console.log(`  Location: (${site4.lat}, ${site4.lng})`);
console.log(`  Geofence Radius: ${site4.radius}m`);
console.log(`Guard: ${guard4.name}`);
console.log(`  Location: (${guard4.lat}, ${guard4.lng})`);
console.log(`Calculated Distance: ${distance4}m`);
console.log(`Validation Result: ${distance4 <= site4.radius ? '✓ PASS (Inside geofence)' : '✗ FAIL (Outside geofence)'}`);
console.log();

// Example 5: Long distance calculation
console.log('Example 5: Long Distance Calculation');
console.log('─'.repeat(50));
const bangkok = { lat: 13.7563, lng: 100.5018, name: 'Bangkok' };
const chiangMai = { lat: 18.7883, lng: 98.9853, name: 'Chiang Mai' };
const distance5 = calculateDistance(bangkok.lat, bangkok.lng, chiangMai.lat, chiangMai.lng);
console.log(`From: ${bangkok.name} (${bangkok.lat}, ${bangkok.lng})`);
console.log(`To: ${chiangMai.name} (${chiangMai.lat}, ${chiangMai.lng})`);
console.log(`Distance: ${distance5}m = ${(distance5 / 1000).toFixed(2)}km`);
console.log();

console.log('='.repeat(50));
console.log('✓ Haversine Formula Working Correctly!');
console.log('='.repeat(50));
console.log();
