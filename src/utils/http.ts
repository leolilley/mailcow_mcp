// import { HTTPConfig, HTTPRequestInfo, HTTPResponseInfo } from '../types';
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as https from 'https';

export function createHTTPClient(config: any): AxiosInstance {
  return axios.create({
    timeout: config.timeout,
    maxRedirects: config.maxRedirects,
    httpsAgent: new https.Agent({
      rejectUnauthorized: config.validateSSL,
    }),
  });
}

export function buildURL(baseURL: string, path: string, params?: Record<string, string>): string {
  const url = new URL(path, baseURL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  return url.toString();
}

export function validateResponse(response: AxiosResponse): void {
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
} 