import axios, { AxiosError, AxiosInstance } from 'axios';

export interface ApiClientConfig {
  baseURL: string;
  getToken: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void | Promise<void>;
  extraHeaders?: Record<string, string>;
}

export function createApiClient(config: ApiClientConfig): AxiosInstance {
  const api = axios.create({
    baseURL: config.baseURL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...config.extraHeaders,
    },
  });

  api.interceptors.request.use(async (reqConfig) => {
    const token = await config.getToken();
    if (token) {
      reqConfig.headers.Authorization = `Bearer ${token}`;
    }
    return reqConfig;
  });

  api.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      if (error.response?.status === 401) {
        await config.onUnauthorized?.();
      }
      return Promise.reject(error);
    }
  );

  return api;
}
