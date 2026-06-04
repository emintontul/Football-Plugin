import type { HippoBridge } from './types';
import { BridgeError, BridgeTimeoutError } from './types';

const TIMEOUT_MS = 10_000;

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type OutgoingMessage = { id: string; type: string; payload?: unknown };

type IncomingMessage = {
  id: string;
  type: 'RESPONSE' | 'EVENT';
  success: boolean;
  payload?: unknown;
  error?: string;
};

type PendingEntry = { resolve: (v: unknown) => void; reject: (e: Error) => void };

export class PostMessageBridge implements HippoBridge {
  private pending = new Map<string, PendingEntry>();
  private handlers = new Map<string, Set<(payload: unknown) => void>>();

  constructor() {
    window.addEventListener('message', this.handleMessage);
  }

  private handleMessage = (event: MessageEvent): void => {
    let msg: unknown;
    try {
      msg = typeof event.data === 'string' ? (JSON.parse(event.data) as unknown) : event.data;
    } catch {
      return;
    }

    if (typeof msg !== 'object' || msg === null) return;
    const m = msg as Record<string, unknown>;
    if (typeof m['id'] !== 'string' || typeof m['type'] !== 'string') return;

    const incoming = msg as IncomingMessage;

    if (incoming.type === 'RESPONSE') {
      const entry = this.pending.get(incoming.id);
      if (!entry) return;
      this.pending.delete(incoming.id);
      if (incoming.success) {
        entry.resolve(incoming.payload);
      } else {
        entry.reject(new BridgeError(incoming.error ?? 'Bridge request failed'));
      }
      return;
    }

    if (incoming.type === 'EVENT') {
      // For events, `id` carries the event name (e.g. 'THEME_CHANGED')
      const handlers = this.handlers.get(incoming.id);
      if (handlers) handlers.forEach((h) => h(incoming.payload));
    }
  };

  private post(type: string, payload?: unknown): void {
    const msg: OutgoingMessage = { id: genId(), type, payload };
    window.ReactNativeWebView?.postMessage(JSON.stringify(msg));
  }

  private request<T>(type: string, payload?: unknown): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = genId();
      const msg: OutgoingMessage = { id, type, payload };

      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new BridgeTimeoutError(type));
      }, TIMEOUT_MS);

      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v as T); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });

      window.ReactNativeWebView?.postMessage(JSON.stringify(msg));
    });
  }

  async isReady(): Promise<void> {
    // window.ReactNativeWebView is already present when this bridge is instantiated
  }

  async getUser() {
    return this.request<{ id: string; displayName: string; avatarUrl?: string }>('GET_USER');
  }

  async getToken(): Promise<string> {
    return this.request<string>('GET_TOKEN');
  }

  async getLocale(): Promise<string> {
    try {
      return await this.request<string>('GET_LOCALE');
    } catch {
      return navigator.language ?? 'tr';
    }
  }

  async getTheme() {
    return this.request<{ mode: 'light' | 'dark'; tokens: Record<string, string> }>('GET_THEME');
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.post('SHOW_TOAST', { message, type });
  }

  haptic(type: 'light' | 'medium' | 'success' | 'error'): void {
    this.post('HAPTIC', { type });
  }

  dismiss(): void {
    this.post('CLOSE');
  }

  on<T>(event: string, handler: (payload: T) => void): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler as (payload: unknown) => void);
    return () => this.handlers.get(event)?.delete(handler as (payload: unknown) => void);
  }
}
