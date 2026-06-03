import type { HippoBridge } from './types';

/**
 * Wraps @gethippoai/host-sdk when it is installed and running inside a Hippo host.
 *
 * The SDK is loaded dynamically so the bundle does not break when the package
 * is absent. If the import fails or the SDK reports no Hippo host, the
 * BridgeProvider falls through to PostMessageBridge / MockBridge.
 *
 * Assumptions (SDK not publicly available at scaffold time):
 *  - The SDK exports a default object or class with the same method names as
 *    HippoBridge, or a `createBridge()` factory.
 *  - It exposes a synchronous `isHippoHost()` / `HippoSDK.isAvailable()` guard.
 *  - All async methods return Promises compatible with HippoBridge.
 *  - Event subscriptions follow Node-style emitter (on/off) or return an
 *    unsubscribe function — we normalise to the latter below.
 *
 * Update this file once the SDK is available on npm.
 */

type SDKModule = {
  isAvailable?: () => boolean;
  isHippoHost?: () => boolean;
  default?: HippoSDKLike;
  createBridge?: () => HippoSDKLike;
};

type HippoSDKLike = {
  isReady?(): Promise<void>;
  ready?(): Promise<void>;
  getUser(): Promise<{ id: string; displayName: string; avatarUrl?: string }>;
  getToken(): Promise<string>;
  getTheme(): Promise<{ mode: 'light' | 'dark'; tokens: Record<string, string> }>;
  showToast(message: string, type?: string): void;
  haptic(type: string): void;
  close(): void;
  on(event: string, handler: (payload: unknown) => void): (() => void) | void;
  off?(event: string, handler: (payload: unknown) => void): void;
};

export async function tryLoadSDKBridge(): Promise<HippoBridge | null> {
  let mod: SDKModule;
  try {
    const specifier = '@gethippoai/host-sdk';
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    mod = (await import(/* @vite-ignore */ specifier)) as SDKModule;
  } catch {
    return null;
  }

  const available = mod.isAvailable?.() ?? mod.isHippoHost?.() ?? false;
  if (!available) return null;

  const sdk: HippoSDKLike = mod.createBridge ? mod.createBridge() : (mod.default as HippoSDKLike);
  if (!sdk) return null;

  return new HippoSDKBridge(sdk);
}

class HippoSDKBridge implements HippoBridge {
  constructor(private sdk: HippoSDKLike) {}

  isReady(): Promise<void> {
    return (this.sdk.isReady ?? this.sdk.ready ?? (() => Promise.resolve())).call(this.sdk);
  }

  getUser() {
    return this.sdk.getUser();
  }

  getToken() {
    return this.sdk.getToken();
  }

  getTheme() {
    return this.sdk.getTheme();
  }

  showToast(message: string, type?: 'success' | 'error' | 'info') {
    this.sdk.showToast(message, type);
  }

  haptic(type: 'light' | 'medium' | 'success' | 'error') {
    this.sdk.haptic(type);
  }

  close() {
    this.sdk.close();
  }

  on<T>(event: string, handler: (payload: T) => void): () => void {
    const result = this.sdk.on(event, handler as (payload: unknown) => void);
    if (typeof result === 'function') return result;
    return () => this.sdk.off?.(event, handler as (payload: unknown) => void);
  }
}
