'use strict';

// Client ID extracted from the MySkoda Android app
export const CLIENT_ID = '7f045eee-7003-4379-9968-9355ed2adb06@apps_vw-dilab_com';
export const REDIRECT_URI = 'myskoda://redirect/login/';

export const BASE_URL_SKODA = 'https://mysmob.api.connect.skoda-auto.cz';
export const BASE_URL_IDENT = 'https://identity.vwgroup.io';

export const OIDC_SCOPES = 'address badge birthdate cars driversLicense dealers email mileage mbb nationalIdentifier openid phone profession profile vin';

export const DEFAULT_POLL_INTERVAL_MINUTES = 15;
export const MIN_POLL_INTERVAL_MINUTES = 5;
export const MAX_POLL_INTERVAL_MINUTES = 60;

export const POST_ACTION_REFRESH_DELAYS_MS = [15000, 45000, 120000];

export const REQUEST_TIMEOUT_MS = 300000;
export const MAX_AUTH_RETRIES = 3;
export const MAX_API_RETRIES = 3;
export const RETRY_BACKOFF_BASE_MS = 2000;
