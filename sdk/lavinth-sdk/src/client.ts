/**
 * Lavinth API Client
 * Handles all HTTP communication with the Lavinth API
 */

import { LavinthConfig, LavinthError, ApiResponse } from './types';

const DEFAULT_API_URL = 'https://api.lavinth.io';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRY_ATTEMPTS = 3;

export class ApiClient {
  private apiKey: string;
  private apiUrl: string;
  private timeout: number;
  private retryAttempts: number;
  private onError?: (error: LavinthError) => void;

  constructor(config: LavinthConfig) {
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl || this.getApiUrlForEnvironment(config.environment);
    this.timeout = config.timeout || DEFAULT_TIMEOUT;
    this.retryAttempts = config.retryAttempts || DEFAULT_RETRY_ATTEMPTS;
    this.onError = config.onError;
  }

  private getApiUrlForEnvironment(env?: string): string {
    switch (env) {
      case 'development':
        return 'http://localhost:3001';
      case 'staging':
        return 'https://staging-api.lavinth.io';
      default:
        return DEFAULT_API_URL;
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    attempt: number = 1
  ): Promise<ApiResponse<T>> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        const error = new LavinthError(
          data.error || `Request failed with status ${response.status}`,
          'API_ERROR',
          response.status,
          data
        );

        if (this.onError) {
          this.onError(error);
        }

        // Retry on 5xx errors
        if (response.status >= 500 && attempt < this.retryAttempts) {
          await this.sleep(Math.pow(2, attempt) * 1000);
          return this.fetchWithRetry<T>(url, options, attempt + 1);
        }

        return {
          success: false,
          error: error.message,
          statusCode: response.status,
        };
      }

      return {
        success: true,
        data,
        statusCode: response.status,
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        const timeoutError = new LavinthError(
          'Request timed out',
          'TIMEOUT',
          undefined,
          { timeout: this.timeout }
        );

        if (this.onError) {
          this.onError(timeoutError);
        }

        return {
          success: false,
          error: 'Request timed out',
          statusCode: 408,
        };
      }

      // Retry on network errors
      if (attempt < this.retryAttempts) {
        await this.sleep(Math.pow(2, attempt) * 1000);
        return this.fetchWithRetry<T>(url, options, attempt + 1);
      }

      const networkError = new LavinthError(
        error.message || 'Network error',
        'NETWORK_ERROR',
        undefined,
        error
      );

      if (this.onError) {
        this.onError(networkError);
      }

      return {
        success: false,
        error: error.message || 'Network error',
        statusCode: 0,
      };
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'x-access-token': this.apiKey,
    };
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = `${this.apiUrl}${endpoint}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    return this.fetchWithRetry<T>(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.fetchWithRetry<T>(`${this.apiUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.fetchWithRetry<T>(`${this.apiUrl}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.fetchWithRetry<T>(`${this.apiUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
  }
}
