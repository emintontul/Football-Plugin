import type { HippoBridge } from './types';

const DEFAULT_THEME_TOKENS: Record<string, string> = {
  '--hippo-bg': '#ffffff',
  '--hippo-fg': '#000000',
  '--hippo-primary': '#5445c2',
  '--hippo-primary-fg': '#ffffff',
  '--hippo-primary-light': '#ECEAF8',
  '--hippo-secondary': '#EDEDF0',
  '--hippo-secondary-fg': '#60646C',
  '--hippo-surface': '#F5F5F7',
  '--hippo-border': '#E2E2E5',
  '--hippo-muted': '#60646C',
  '--hippo-muted-fg': '#8B8D98',
  '--hippo-error': '#FF3B30',
  '--hippo-success': '#22c55e',
};

type EventHandler<T = unknown> = (payload: T) => void;

export class MockBridge implements HippoBridge {
  private handlers = new Map<string, Set<EventHandler>>();

  async isReady(): Promise<void> {
    await new Promise((r) => setTimeout(r, 100));
  }

  async getUser() {
    return { id: 'mock-user-1', displayName: 'Test User' };
  }

  async getToken(): Promise<string> {
    return import.meta.env.VITE_DEV_TOKEN ?? 'mock-token-abc123';
  }

  async getLocale(): Promise<string> {
    return navigator.language ?? 'tr';
  }

  async getTheme() {
    return { mode: 'light' as const, tokens: DEFAULT_THEME_TOKENS };
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    console.log(`[MockBridge] toast(${type}): ${message}`);
  }

  haptic(type: 'light' | 'medium' | 'success' | 'error'): void {
    console.log(`[MockBridge] haptic(${type})`);
  }

  dismiss(): void {
    console.log('[MockBridge] dismiss()');
  }

  on<T>(event: string, handler: (payload: T) => void): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler as EventHandler);
    return () => this.handlers.get(event)?.delete(handler as EventHandler);
  }
}
