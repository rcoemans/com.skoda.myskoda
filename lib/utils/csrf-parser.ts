'use strict';

export interface CSRFState {
  csrf: string;
  relayState: string;
  hmac: string;
}

/**
 * Parse CSRF token, relay state, and HMAC from an HTML login form response.
 * The VW identity server returns hidden form fields with these values.
 */
export function parseCSRF(html: string): CSRFState {
  const csrfMatch = html.match(/name="_csrf"\s+value="([^"]+)"/);
  const relayStateMatch = html.match(/name="relayState"\s+value="([^"]+)"/);
  const hmacMatch = html.match(/name="hmac"\s+value="([^"]+)"/);

  if (!csrfMatch || !relayStateMatch || !hmacMatch) {
    // Try alternative patterns
    const csrf2 = html.match(/name='_csrf'\s+value='([^']+)'/);
    const relay2 = html.match(/name='relayState'\s+value='([^']+)'/);
    const hmac2 = html.match(/name='hmac'\s+value='([^']+)'/);

    const csrf = csrfMatch?.[1] || csrf2?.[1];
    const relayState = relayStateMatch?.[1] || relay2?.[1];
    const hmac = hmacMatch?.[1] || hmac2?.[1];

    if (!csrf || !relayState || !hmac) {
      throw new Error('Failed to parse CSRF state from login page');
    }

    return { csrf, relayState, hmac };
  }

  return {
    csrf: csrfMatch[1],
    relayState: relayStateMatch[1],
    hmac: hmacMatch[1],
  };
}
