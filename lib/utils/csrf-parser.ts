'use strict';

export interface CSRFState {
  csrf: string;
  relayState: string;
  hmac: string;
}

/**
 * Parse CSRF token, relay state, and HMAC from the VW identity server HTML.
 *
 * The server embeds a JavaScript object in a <script> tag:
 *   window._IDK = {
 *     csrf_token: "...",
 *     templateModel: {
 *       hmac: "...",
 *       relayState: "...",
 *       ...
 *     },
 *     ...
 *   }
 *
 * The object is YAML-compatible but NOT strict JSON (unquoted keys, trailing
 * commas). We extract values with targeted regexes instead of trying to parse
 * the whole blob.
 */
export function parseCSRF(html: string): CSRFState {
  // Extract the window._IDK block
  const idkMatch = html.match(/window\._IDK\s*=\s*\{([\s\S]*?)(?:\n\s*\};\s*<\/script>|\n\s*\};)/);
  if (!idkMatch) {
    throw new Error('Failed to find window._IDK in login page HTML');
  }

  const idkBlock = idkMatch[1];

  // Extract csrf_token
  const csrfMatch = idkBlock.match(/csrf_token\s*:\s*['"]([^'"]+)['"]/);
  if (!csrfMatch) {
    throw new Error('Failed to parse csrf_token from window._IDK');
  }

  // Extract templateModel sub-block
  const templateMatch = idkBlock.match(/templateModel\s*:\s*\{([\s\S]*?)\}/);
  if (!templateMatch) {
    throw new Error('Failed to parse templateModel from window._IDK');
  }

  const templateBlock = templateMatch[1];

  // Extract hmac and relayState from templateModel
  const hmacMatch = templateBlock.match(/hmac\s*:\s*['"]([^'"]+)['"]/);
  const relayStateMatch = templateBlock.match(/relayState\s*:\s*['"]([^'"]+)['"]/);

  if (!hmacMatch) {
    throw new Error('Failed to parse hmac from templateModel');
  }
  if (!relayStateMatch) {
    throw new Error('Failed to parse relayState from templateModel');
  }

  return {
    csrf: csrfMatch[1],
    relayState: relayStateMatch[1],
    hmac: hmacMatch[1],
  };
}
