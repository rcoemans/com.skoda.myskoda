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
  // The VW identity server embeds the data in a <script> block as:
  //   window._IDK = { csrf_token: '...', templateModel: { hmac: '...', relayState: '...' }, ... }
  //
  // Approach: find "window._IDK" then grab everything from there to the end
  // of the text, and extract the three values with individual regexes.
  // This is intentionally loose to tolerate formatting changes.

  const idkIdx = html.indexOf('window._IDK');
  if (idkIdx === -1) {
    // Include a snippet of the HTML to help debug what the server returned
    const snippet = html.substring(0, 500).replace(/\s+/g, ' ');
    throw new Error(`Failed to find window._IDK in login page HTML. Snippet: ${snippet}`);
  }

  // Work with everything after "window._IDK"
  const idkBlock = html.substring(idkIdx);

  // The templateModel value is a JSON string with double-quoted keys/values:
  //   "hmac":"abc123","relayState":"xyz789"
  // while csrf_token uses JS-style unquoted key:
  //   csrf_token: 'abc...'
  // The ['"]? after the key name handles the optional closing quote that
  // appears in JSON-style ("hmac":) vs JS-style (hmac:) notation.

  // Extract csrf_token — JS-style key, quoted value
  const csrfMatch = idkBlock.match(/csrf_token['"]?\s*:\s*['"]([^'"]+)['"]/);
  if (!csrfMatch) {
    throw new Error('Failed to parse csrf_token from window._IDK');
  }

  // Extract hmac — may be JSON-style "hmac":"value" inside templateModel
  const hmacMatch = idkBlock.match(/hmac['"]?\s*:\s*['"]([^'"]+)['"]/);
  if (!hmacMatch) {
    throw new Error('Failed to parse hmac from window._IDK');
  }

  // Extract relayState — may be JSON-style "relayState":"value"
  const relayStateMatch = idkBlock.match(/relayState['"]?\s*:\s*['"]([^'"]+)['"]/);
  if (!relayStateMatch) {
    throw new Error('Failed to parse relayState from window._IDK');
  }

  return {
    csrf: csrfMatch[1],
    relayState: relayStateMatch[1],
    hmac: hmacMatch[1],
  };
}
