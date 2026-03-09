'use strict';

import { URL, URLSearchParams } from 'url';
import { httpRequest, CookieJar } from '../utils/http';
import { generateVerifier, generateChallenge, generateNonce } from '../utils/pkce';
import { parseCSRF, CSRFState } from '../utils/csrf-parser';
import { redactToken } from '../utils/redact';
import {
  CLIENT_ID,
  REDIRECT_URI,
  BASE_URL_SKODA,
  BASE_URL_IDENT,
  OIDC_SCOPES,
  MAX_AUTH_RETRIES,
} from '../constants';
import { IDKSession } from '../types';

export class AuthClient {
  private session: IDKSession | null = null;
  private log: (...args: any[]) => void;
  private cookieJar: CookieJar = new CookieJar();

  constructor(log: (...args: any[]) => void) {
    this.log = log;
  }

  get accessToken(): string | null {
    return this.session?.accessToken ?? null;
  }

  get refreshToken(): string | null {
    return this.session?.refreshToken ?? null;
  }

  get idkSession(): IDKSession | null {
    return this.session;
  }

  /**
   * Check if the access token is expired or about to expire (within 10 min).
   */
  isTokenExpired(): boolean {
    if (!this.session) return true;
    try {
      const payload = JSON.parse(
        Buffer.from(this.session.accessToken.split('.')[1], 'base64').toString(),
      );
      const expiry = payload.exp * 1000;
      return Date.now() + 10 * 60 * 1000 > expiry;
    } catch {
      return true;
    }
  }

  /**
   * Check if the refresh token is expired.
   */
  isRefreshTokenExpired(token?: string): boolean {
    const rt = token || this.session?.refreshToken;
    if (!rt) return true;
    try {
      const payload = JSON.parse(Buffer.from(rt.split('.')[1], 'base64').toString());
      const expiry = payload.exp * 1000;
      return Date.now() + 60 * 1000 > expiry;
    } catch {
      return true;
    }
  }

  /**
   * Full login using email and password.
   */
  async authorize(email: string, password: string): Promise<IDKSession> {
    this.log('Starting authorization flow');

    // Fresh cookie jar for each login attempt — the VW identity server
    // requires session cookies to correlate the multi-step login flow
    this.cookieJar = new CookieJar();

    const verifier = generateVerifier();

    // Step 1: Initial OIDC authorize
    const loginMeta = await this._initialOidcAuthorize(verifier);
    this.log('OIDC authorize completed, entering email');

    // Step 2: Enter email
    const emailMeta = await this._enterEmail(loginMeta, email);
    this.log('Email entered, entering password');

    // Step 3: Enter password and follow redirects to get auth code
    const code = await this._enterPassword(emailMeta, email, password);
    this.log('Authentication code obtained, exchanging for tokens');

    // Step 4: Exchange code for tokens
    this.session = await this._exchangeCode(code, verifier);
    this.log('Authorization complete, token obtained:', redactToken(this.session.accessToken));

    return this.session;
  }

  /**
   * Authorize using an existing refresh token.
   */
  async authorizeWithRefreshToken(refreshToken: string): Promise<IDKSession> {
    if (this.isRefreshTokenExpired(refreshToken)) {
      throw new Error('Refresh token has expired. Please re-authenticate with email/password.');
    }

    const response = await httpRequest(
      `${BASE_URL_SKODA}/api/v1/authentication/refresh-token?tokenType=CONNECT`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: refreshToken }),
      },
    );

    if (response.statusCode !== 200) {
      throw new Error(`Refresh token authorization failed with status ${response.statusCode}`);
    }

    this.session = JSON.parse(response.body) as IDKSession;
    return this.session;
  }

  /**
   * Refresh the current access token using the stored refresh token.
   */
  async refreshAccessToken(): Promise<void> {
    if (!this.session) throw new Error('Not authorized');
    if (!this.isTokenExpired()) return;

    this.log('Access token expired, refreshing');
    for (let attempt = 0; attempt < MAX_AUTH_RETRIES; attempt++) {
      try {
        const response = await httpRequest(
          `${BASE_URL_SKODA}/api/v1/authentication/refresh-token?tokenType=CONNECT`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: this.session.refreshToken }),
          },
        );
        if (response.statusCode === 200) {
          this.session = JSON.parse(response.body) as IDKSession;
          this.log('Token refreshed successfully');
          return;
        }
        this.log(`Token refresh attempt ${attempt + 1}/${MAX_AUTH_RETRIES} failed: ${response.statusCode}`);
      } catch (err) {
        this.log(`Token refresh attempt ${attempt + 1} error:`, err);
      }
    }
    throw new Error('Failed to refresh access token after multiple attempts');
  }

  /**
   * Get a valid access token, refreshing if necessary.
   */
  async getAccessToken(): Promise<string> {
    if (!this.session) throw new Error('Not authorized');
    if (this.isTokenExpired()) {
      await this.refreshAccessToken();
    }
    return this.session!.accessToken;
  }

  // --- Private auth flow steps ---

  private async _initialOidcAuthorize(verifier: string): Promise<CSRFState> {
    const challenge = generateChallenge(verifier);
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      nonce: generateNonce(),
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: OIDC_SCOPES,
      code_challenge: challenge,
      code_challenge_method: 's256',
      prompt: 'login',
    });

    const response = await httpRequest(
      `${BASE_URL_IDENT}/oidc/v1/authorize?${params.toString()}`,
      { followRedirects: true, cookieJar: this.cookieJar },
    );

    return parseCSRF(response.body);
  }

  private async _enterEmail(csrf: CSRFState, email: string): Promise<CSRFState> {
    const body = new URLSearchParams({
      relayState: csrf.relayState,
      email: email,
      hmac: csrf.hmac,
      _csrf: csrf.csrf,
    });

    const response = await httpRequest(
      `${BASE_URL_IDENT}/signin-service/v1/${CLIENT_ID}/login/identifier`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        followRedirects: true,
        cookieJar: this.cookieJar,
      },
    );

    return parseCSRF(response.body);
  }

  private async _enterPassword(csrf: CSRFState, email: string, password: string): Promise<string> {
    const body = new URLSearchParams({
      relayState: csrf.relayState,
      email: email,
      password: password,
      hmac: csrf.hmac,
      _csrf: csrf.csrf,
    });

    let response = await httpRequest(
      `${BASE_URL_IDENT}/signin-service/v1/${CLIENT_ID}/login/authenticate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        followRedirects: false,
        cookieJar: this.cookieJar,
      },
    );

    // Follow redirects until we hit the myskoda:// redirect
    let location = response.headers['location'] as string | undefined;
    while (location && !location.startsWith('myskoda://')) {
      if (location.includes('terms-and-conditions')) {
        throw new Error('Terms and conditions acceptance required. Please accept in the MyŠkoda app first.');
      }
      if (location.includes('consent/marketing')) {
        throw new Error('Marketing consent page encountered. Please complete setup in the MyŠkoda app first.');
      }
      response = await httpRequest(location, { followRedirects: false, cookieJar: this.cookieJar });
      location = response.headers['location'] as string | undefined;
    }

    if (!location || !location.startsWith('myskoda://')) {
      throw new Error('Failed to obtain authorization code. Check your credentials.');
    }

    const url = new URL(location);
    const code = url.searchParams.get('code');
    if (!code) {
      throw new Error('Authorization code not found in redirect URL');
    }
    return code;
  }

  private async _exchangeCode(code: string, verifier: string): Promise<IDKSession> {
    const response = await httpRequest(
      `${BASE_URL_SKODA}/api/v1/authentication/exchange-authorization-code?tokenType=CONNECT`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          redirectUri: REDIRECT_URI,
          verifier: verifier,
        }),
        cookieJar: this.cookieJar,
      },
    );

    if (response.statusCode !== 200) {
      throw new Error(`Token exchange failed with status ${response.statusCode}`);
    }

    return JSON.parse(response.body) as IDKSession;
  }
}
