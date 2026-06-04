import tr from '../../locales/tr.json';
import en from '../../locales/en.json';

type Translations = Record<string, string>;

const LOCALES: Record<string, Translations> = { tr, en };

export function getTranslations(locale: string): Translations {
  const lang = locale.split('-')[0].toLowerCase();
  return LOCALES[lang] ?? (LOCALES['tr'] as Translations);
}

export function createT(locale: string) {
  const dict = getTranslations(locale);
  const fallback = LOCALES['tr'] as Translations;
  return function t(key: string, params?: Record<string, string | number>): string {
    let str = dict[key] ?? fallback[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return str;
  };
}

export type TFn = ReturnType<typeof createT>;
