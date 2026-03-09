'use strict';

import https from 'https';
import http from 'http';
import { URL } from 'url';

export interface HttpResponse {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

export interface HttpRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  followRedirects?: boolean;
  maxRedirects?: number;
  timeout?: number;
  cookieJar?: CookieJar;
}

/**
 * Simple cookie jar that persists cookies across requests within a session.
 * Supports Set-Cookie parsing, domain/path scoping, and Cookie header generation.
 */
export class CookieJar {
  private cookies: Map<string, Map<string, { value: string; domain: string; path: string }>> = new Map();

  /**
   * Store cookies from Set-Cookie response headers.
   */
  setCookies(setCookieHeaders: string | string[] | undefined, requestUrl: URL): void {
    if (!setCookieHeaders) return;

    const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];

    for (const header of headers) {
      const parts = header.split(';').map((p) => p.trim());
      const nameValue = parts[0];
      if (!nameValue) continue;

      const eqIdx = nameValue.indexOf('=');
      if (eqIdx < 0) continue;

      const name = nameValue.substring(0, eqIdx);
      const value = nameValue.substring(eqIdx + 1);

      let domain = requestUrl.hostname;
      let path = '/';

      for (const attr of parts.slice(1)) {
        const lower = attr.toLowerCase();
        if (lower.startsWith('domain=')) {
          domain = attr.substring(7).replace(/^\./, '');
        } else if (lower.startsWith('path=')) {
          path = attr.substring(5);
        }
      }

      if (!this.cookies.has(domain)) {
        this.cookies.set(domain, new Map());
      }
      this.cookies.get(domain)!.set(name, { value, domain, path });
    }
  }

  /**
   * Generate a Cookie header value for a given URL.
   */
  getCookieHeader(requestUrl: URL): string {
    const pairs: string[] = [];
    const hostname = requestUrl.hostname;
    const pathname = requestUrl.pathname;

    for (const [domain, domainCookies] of this.cookies) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        for (const [name, cookie] of domainCookies) {
          if (pathname.startsWith(cookie.path)) {
            pairs.push(`${name}=${cookie.value}`);
          }
        }
      }
    }

    return pairs.join('; ');
  }
}

/**
 * Minimal HTTP client using Node.js built-in modules.
 * Supports optional cookie jar for session-based auth flows.
 */
export async function httpRequest(
  urlStr: string,
  options: HttpRequestOptions = {},
): Promise<HttpResponse> {
  const {
    method = 'GET',
    headers = {},
    body,
    followRedirects = false,
    maxRedirects = 10,
    timeout = 30000,
    cookieJar,
  } = options;

  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const mergedHeaders: Record<string, string> = { ...headers };

    // Inject cookies from jar
    if (cookieJar) {
      const cookieHeader = cookieJar.getCookieHeader(url);
      if (cookieHeader) {
        mergedHeaders['Cookie'] = cookieHeader;
      }
    }

    const reqOptions: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: mergedHeaders,
      timeout,
    };

    if (body && !mergedHeaders['Content-Length'] && !mergedHeaders['content-length']) {
      mergedHeaders['Content-Length'] = Buffer.byteLength(body).toString();
    }

    const req = lib.request(reqOptions, (res) => {
      // Store response cookies in jar
      if (cookieJar) {
        cookieJar.setCookies(res.headers['set-cookie'], url);
      }

      // Handle redirects
      if (
        followRedirects &&
        maxRedirects > 0 &&
        res.statusCode &&
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : `${url.protocol}//${url.host}${res.headers.location}`;

        // Consume the response body
        res.resume();

        httpRequest(redirectUrl, {
          ...options,
          method: 'GET',
          body: undefined,
          maxRedirects: maxRedirects - 1,
          cookieJar,
        })
          .then(resolve)
          .catch(reject);
        return;
      }

      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf-8'),
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout after ${timeout}ms`));
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}
