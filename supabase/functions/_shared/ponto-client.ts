// ============================================================================
// PONTO API CLIENT - Centralized wrapper for Ponto API calls
// Purpose: Handle authentication, retries, rate limits, logging
// ============================================================================

import { signRequest } from './http-signature.ts';

const PONTO_API_BASE = 'https://api.ponto.com';

interface PontoClientOptions {
  accessToken?: string;
  retries?: number;
  timeout?: number;
}

/**
 * Centralized Ponto API client with auto-retry and structured logging
 */
export class PontoClient {
  private accessToken?: string;
  private retries: number;
  private timeout: number;

  constructor(options: PontoClientOptions = {}) {
    this.accessToken = options.accessToken;
    this.retries = options.retries ?? 3;
    this.timeout = options.timeout ?? 30000;
  }

  /**
   * GET request to Ponto API
   */
  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  /**
   * POST request to Ponto API
   */
  async post<T>(path: string, body?: any): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  /**
   * Generic request handler with retries and logging
   */
  private async request<T>(
    method: string,
    path: string,
    body?: any,
    attempt = 1
  ): Promise<T> {
    const url = `${PONTO_API_BASE}${path}`;
    const startTime = Date.now();

    try {
      // Build headers
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Host': 'api.ponto.com',
        'Date': new Date().toUTCString(),
      };

      if (this.accessToken) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
      }

      // Sign request if credentials available
      const bodyStr = body ? JSON.stringify(body) : undefined;
      headers = await signRequest(method, path, headers, bodyStr);

      // Make request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method,
        headers,
        body: bodyStr,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;

      // Log request
      console.log(JSON.stringify({
        event: 'ponto_api_request',
        method,
        path,
        status: response.status,
        duration_ms: duration,
        attempt,
      }));

      // Handle rate limiting with exponential backoff
      if (response.status === 429 && attempt <= this.retries) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
        console.warn(`Rate limited, retrying after ${retryAfter}s`);
        await sleep(retryAfter * 1000);
        return this.request<T>(method, path, body, attempt + 1);
      }

      // Handle server errors with retry
      if (response.status >= 500 && attempt <= this.retries) {
        const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.warn(`Server error ${response.status}, retrying after ${backoff}ms`);
        await sleep(backoff);
        return this.request<T>(method, path, body, attempt + 1);
      }

      // Parse response
      const data = await response.json();

      if (!response.ok) {
        console.error('Ponto API error:', {
          status: response.status,
          error: data,
        });
        throw new PontoAPIError(response.status, data);
      }

      return data;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.error(JSON.stringify({
        event: 'ponto_api_error',
        method,
        path,
        error: error instanceof Error ? error.message : String(error),
        duration_ms: duration,
        attempt,
      }));

      // Retry on network errors
      if (attempt <= this.retries && isRetryableError(error)) {
        const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.warn(`Network error, retrying after ${backoff}ms`);
        await sleep(backoff);
        return this.request<T>(method, path, body, attempt + 1);
      }

      throw error;
    }
  }
}

/**
 * Custom error for Ponto API responses
 */
export class PontoAPIError extends Error {
  constructor(public status: number, public data: any) {
    super(`Ponto API error: ${status}`);
    this.name = 'PontoAPIError';
  }
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  return (
    error.name === 'AbortError' ||
    error.message?.includes('network') ||
    error.message?.includes('timeout')
  );
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Token refresh helper
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const clientId = Deno.env.get('PONTO_CLIENT_ID');
  const clientSecret = Deno.env.get('PONTO_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('PONTO_CREDENTIALS_NOT_SET');
  }

  const response = await fetch('https://api.ponto.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token refresh failed:', error);
    throw new Error('PONTO_TOKEN_REFRESH_FAILED');
  }

  return response.json();
}
