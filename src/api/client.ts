import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '@/lib/env';
import type { HippoBridge } from '@/bridge/types';

let bridgeInstance: HippoBridge | null = null;

export function setBridgeForClient(bridge: HippoBridge) {
  bridgeInstance = bridge;
}

export const apiClient = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (bridgeInstance) {
    const token = await bridgeInstance.getToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config;
    if (error.response?.status === 401 && !isRefreshing && original && bridgeInstance) {
      isRefreshing = true;
      try {
        const freshToken = await bridgeInstance.getToken();
        original.headers.Authorization = `Bearer ${freshToken}`;
        return await apiClient(original);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);
