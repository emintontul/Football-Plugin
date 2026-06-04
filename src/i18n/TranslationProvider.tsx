import React, { createContext, useContext, useMemo } from 'react';
import { createT, type TFn } from './index';
import { useLocale } from '@/hooks/useLocale';

type ContextValue = { t: TFn; locale: string };

const TranslationContext = createContext<ContextValue | null>(null);

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const t = useMemo(() => createT(locale), [locale]);
  const value = useMemo(() => ({ t, locale }), [t, locale]);
  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

export function useTranslation(): ContextValue {
  const ctx = useContext(TranslationContext);
  if (!ctx) throw new Error('useTranslation must be used within TranslationProvider');
  return ctx;
}
