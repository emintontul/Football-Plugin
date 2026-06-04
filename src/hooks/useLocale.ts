import { useEffect, useState } from 'react';
import { useBridge } from '@/bridge/BridgeProvider';

export function useLocale(): string {
  const { bridge } = useBridge();
  const [locale, setLocale] = useState<string>(() => navigator.language ?? 'tr');

  useEffect(() => {
    bridge.getLocale().then(setLocale).catch(() => {});
  }, [bridge]);

  return locale;
}
