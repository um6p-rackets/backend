export const COOKIE_PATH = '/api/v1/auth';
export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';
export const ACCESS_TTL_SECONDS = 15 * 60;          // Time To Live => 15 minutes
export const REFRESH_TTL_SECONDS = 7 * 24 * 3600;   // Time To Live => 7 days

export const OAUTH_COOKIE_PATH = '/api/v1/auth/google';
export const OAUTH_COOKIE = 'oauth_state';
export const OAUTH_TTL_SECONDS = 10 * 60_000;            // Time To Live => 10 minutes
export const OAUTH_AUDIENCE = 'google-oauth';

export const REQUEST_LIMIT = 20;  // Max number of requests per 10 minutes for rate limiting
export const REQUEST_TTL = 600;     // Time To Live  => 10 minutes for rate limiting
