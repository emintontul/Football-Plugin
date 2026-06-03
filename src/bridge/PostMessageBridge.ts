import { z } from 'zod';
import {
  IncomingMessageSchema,
  TokenPayloadSchema,
  ThemePayloadSchema,
  UserPayloadSchema,
  type HippoBridge,
  type IncomingMessage,
  type OutgoingMessage,
} from './types';

const REQUEST_TIMEOUT_MS = 10_000;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type PendingRequest = {
  resolve: (msg: IncomingMessage) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

type EventHandler<T = unknown> = (payload: T) => void;

export class PostMessageBridge implements HippoBridge {
  private pending = new Map<string, PendingRequest>();
  private eventHandlers = new Map<string, Set<EventHandler>>();
  private removeListeners: (() => void) | null = null;

  constructor() {
    this.attachListeners();
  }

  private attachListeners() {
    const handler = (e: MessageEvent) => this.handleIncoming(e);
    window.addEventListener('message', handler);
    document.addEventListener('message', handler as EventListener);
    this.removeListeners = () => {
      window.removeEventListener('message', handler);
      document.removeEventListener('message', handler as EventListener);
    };
  }

  private handleIncoming(e: MessageEvent) {
    let raw: unknown;
    try {
      raw = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    } catch {
      return;
    }

    const result = IncomingMessageSchema.safeParse(raw);
    if (!result.success) return;

    const msg = result.data;

    if (msg.type === 'EVENT') {
      const handlers = this.eventHandlers.get(msg.id);
      if (handlers) handlers.forEach((h) => h(msg.payload));
      return;
    }

    const pending = this.pending.get(msg.id);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pending.delete(msg.id);

    if (msg.error) {
      pending.reject(new Error(`[PostMessageBridge] ${msg.error.code}: ${msg.error.message}`));
    } else {
      pending.resolve(msg);
    }
  }

  private send(type: string, payload?: unknown): Promise<IncomingMessage> {
    return new Promise((resolve, reject) => {
      const id = generateId();
      const message: OutgoingMessage = { id, type, payload };

      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`[PostMessageBridge] Request "${type}" timed out after ${REQUEST_TIMEOUT_MS}ms`));
      }, REQUEST_TIMEOUT_MS);

      this.pending.set(id, { resolve, reject, timer });
      window.ReactNativeWebView!.postMessage(JSON.stringify(message));
    });
  }

  async isReady(): Promise<void> {
    await this.send('READY');
  }

  async getUser() {
    const msg = await this.send('GET_USER');
    return UserPayloadSchema.parse(msg.payload);
  }

  async getToken(): Promise<string> {
    const msg = await this.send('GET_TOKEN');
    return TokenPayloadSchema.parse(msg.payload).token;
  }

  async getTheme() {
    const msg = await this.send('GET_THEME');
    return ThemePayloadSchema.parse(msg.payload);
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const id = generateId();
    window.ReactNativeWebView!.postMessage(JSON.stringify({ id, type: 'SHOW_TOAST', payload: { message, type } }));
  }

  haptic(type: 'light' | 'medium' | 'success' | 'error'): void {
    const id = generateId();
    window.ReactNativeWebView!.postMessage(JSON.stringify({ id, type: 'HAPTIC', payload: { type } }));
  }

  close(): void {
    const id = generateId();
    window.ReactNativeWebView!.postMessage(JSON.stringify({ id, type: 'CLOSE' }));
  }

  on<T>(event: string, handler: (payload: T) => void): () => void {
    if (!this.eventHandlers.has(event)) this.eventHandlers.set(event, new Set());
    const handlers = this.eventHandlers.get(event)!;
    handlers.add(handler as EventHandler);
    return () => handlers.delete(handler as EventHandler);
  }

  destroy() {
    this.removeListeners?.();
    this.pending.forEach(({ reject, timer }) => {
      clearTimeout(timer);
      reject(new Error('[PostMessageBridge] destroyed'));
    });
    this.pending.clear();
  }
}

export function validateIncomingPayload<T>(schema: z.ZodType<T>, payload: unknown): T {
  return schema.parse(payload);
}
