'use strict';

/**
 * Redact a VIN to show only the last 6 characters.
 */
export function redactVin(vin: string): string {
  if (!vin || vin.length <= 6) return vin;
  return '***' + vin.slice(-6);
}

/**
 * Redact GPS coordinates for logging.
 */
export function redactCoordinate(value: number | undefined): string {
  if (value === undefined || value === null) return 'N/A';
  return `${value.toFixed(2)}***`;
}

/**
 * Redact a token for logging (show first 8 and last 4 chars).
 */
export function redactToken(token: string): string {
  if (!token || token.length < 16) return '***';
  return `${token.slice(0, 8)}...${token.slice(-4)}`;
}
