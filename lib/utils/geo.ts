'use strict';

/**
 * Calculate the distance between two GPS coordinates using the Haversine formula.
 * Returns the distance in meters.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Check if a position is within a radius of a home location.
 */
export function isAtHome(
  vehicleLat: number,
  vehicleLon: number,
  homeLat: number,
  homeLon: number,
  radiusMeters: number,
): boolean {
  if (!homeLat || !homeLon || !vehicleLat || !vehicleLon) return false;
  return haversineDistance(vehicleLat, vehicleLon, homeLat, homeLon) <= radiusMeters;
}
