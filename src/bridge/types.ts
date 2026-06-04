export interface HippoBridge {
  isReady(): Promise<void>;
  getUser(): Promise<{ id: string; displayName: string; avatarUrl?: string }>;
  getToken(): Promise<string>;
  getLocale(): Promise<string>;
  getTheme(): Promise<{ mode: 'light' | 'dark'; tokens: Record<string, string> }>;
  showToast(message: string, type?: 'success' | 'error' | 'info'): void;
  haptic(type: 'light' | 'medium' | 'success' | 'error'): void;
  dismiss(): void;
  on<T>(event: string, handler: (payload: T) => void): () => void;
}

export type BridgeType = 'sdk' | 'postmessage' | 'mock';

export class BridgeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BridgeError';
  }
}

export class BridgeTimeoutError extends BridgeError {
  constructor(type: string) {
    super(`Bridge timeout: ${type} did not respond within 10s`);
    this.name = 'BridgeTimeoutError';
  }
}
