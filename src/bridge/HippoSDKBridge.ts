import type { HippoBridge } from './types';

const SDK_URL = 'https://plugins.hippo.la/_sdk/v1/plugin-sdk.js';

type HostContext = {
  installationId: string;
  locale: string;
  theme?: { mode: 'light' | 'dark'; tokens: Record<string, string> };
  user?: { id: string; displayName: string; avatarUrl?: string };
  authToken?: string;
  grantedPermissions?: string[];
};

type HostUI = {
  dismiss?: () => void;
  toast?: (message: string, opts?: { type?: string }) => void;
};

type Host = {
  context: HostContext;
  ui?: HostUI;
  storage?: { kv: Record<string, unknown> };
  api?: Record<string, unknown>;
};

type SDKModule = {
  connectToHost: () => Promise<Host>;
};

export async function tryLoadSDKBridge(): Promise<HippoBridge | null> {
  let mod: SDKModule;
  try {
    mod = (await import(/* @vite-ignore */ SDK_URL)) as SDKModule;
  } catch {
    return null;
  }

  if (typeof mod?.connectToHost !== 'function') return null;

  let host: Host;
  try {
    host = await mod.connectToHost();
  } catch {
    return null;
  }

  return new HippoSDKBridge(host);
}

class HippoSDKBridge implements HippoBridge {
  constructor(private host: Host) {}

  async isReady(): Promise<void> {
    // connectToHost() resolves only after hippo.init — already ready
  }

  async getUser() {
    const user = this.host.context.user;
    return {
      id: user?.id ?? this.host.context.installationId,
      displayName: user?.displayName ?? 'Hippo User',
      avatarUrl: user?.avatarUrl,
    };
  }

  async getToken(): Promise<string> {
    return this.host.context.authToken ?? this.host.context.installationId;
  }

  async getLocale(): Promise<string> {
    return this.host.context.locale ?? navigator.language ?? 'tr';
  }

  async getTheme() {
    return (
      this.host.context.theme ?? {
        mode: 'light' as const,
        tokens: {} as Record<string, string>,
      }
    );
  }

  showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.host.ui?.toast?.(message, { type });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  haptic(_type: 'light' | 'medium' | 'success' | 'error'): void {
    // Haptic not yet documented in the web SDK
  }

  dismiss(): void {
    this.host.ui?.dismiss?.();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  on<T>(_event: string, _handler: (payload: T) => void): () => void {
    // Event subscriptions are not yet documented in the web SDK
    return () => {};
  }
}
