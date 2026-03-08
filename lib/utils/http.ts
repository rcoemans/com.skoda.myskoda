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
}

/**
 * Minimal HTTP client using Node.js built-in modules.
 * Avoids external dependencies like node-fetch.
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
  } = options;

  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const reqOptions: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        ...headers,
      },
      timeout,
    };

    if (body && !headers['Content-Length'] && !headers['content-length']) {
      (reqOptions.headers as Record<string, string>)['Content-Length'] = Buffer.byteLength(body).toString();
    }

    const req = lib.request(reqOptions, (res) => {
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
