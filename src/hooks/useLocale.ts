import { useEffect, useState } from 'react';
import { useBridge } from '@/bridge/BridgeProvider';

export function useLocale(): string {
  const { bridge } = useBridge();
  const [locale, setLocale] = useState<string>(() => navigator.language ?? 'tr');

  useEffect(() => {
    bridge.getLocale().then(setLocale).catch(() => {});
  }, [bridge]);

  // The native host re-emits its locale when the user switches app language,
  // so the embedded UI follows the app without a full reload.
  useEffect(() => {
    const onLocaleChange = (e: Event) => {
      const next = (e as CustomEvent<{ locale?: string }>).detail?.locale;
      if (next) setLocale(next);
    };
    window.addEventListener('hippo:locale-change', onLocaleChange);
    return () => window.removeEventListener('hippo:locale-change', onLocaleChange);
  }, []);

  return locale;
}
