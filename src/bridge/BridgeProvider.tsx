import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { tryLoadSDKBridge } from './HippoSDKBridge';
import { PostMessageBridge } from './PostMessageBridge';
import { MockBridge } from './MockBridge';
import type { HippoBridge } from './types';

type BridgeContextValue = {
  bridge: HippoBridge;
  bridgeType: 'sdk' | 'postmessage' | 'mock';
};

const BridgeContext = createContext<BridgeContextValue | null>(null);

export function useBridge(): BridgeContextValue {
  const ctx = useContext(BridgeContext);
  if (!ctx) throw new Error('useBridge must be used within <BridgeProvider>');
  return ctx;
}

async function detectBridge(): Promise<BridgeContextValue> {
  const forceMock = import.meta.env.VITE_MOCK_MODE === 'true';

  if (!forceMock) {
    const sdkBridge = await tryLoadSDKBridge();
    if (sdkBridge) return { bridge: sdkBridge, bridgeType: 'sdk' };

    if (typeof window !== 'undefined' && window.ReactNativeWebView) {
      return { bridge: new PostMessageBridge(), bridgeType: 'postmessage' };
    }
  }

  console.warn('[BridgeProvider] No Hippo host detected — using MockBridge. Set VITE_MOCK_MODE=true to silence this in dev.');
  return { bridge: new MockBridge(), bridgeType: 'mock' };
}

type Props = { children: React.ReactNode };

export function BridgeProvider({ children }: Props) {
  const [ctx, setCtx] = useState<BridgeContextValue | null>(null);
  const detected = useRef(false);

  useEffect(() => {
    if (detected.current) return;
    detected.current = true;

    detectBridge().then(setCtx);
  }, []);

  if (!ctx) return null;

  return <BridgeContext.Provider value={ctx}>{children}</BridgeContext.Provider>;
}
