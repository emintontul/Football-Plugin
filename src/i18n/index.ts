import tr from '../../locales/tr.json';
import en from '../../locales/en.json';
import de from '../../locales/de.json';
import es from '../../locales/es.json';
import fr from '../../locales/fr.json';
import it from '../../locales/it.json';
import nl from '../../locales/nl.json';
import pt from '../../locales/pt.json';
import ru from '../../locales/ru.json';
import ar from '../../locales/ar.json';

type Translations = Record<string, string>;

const LOCALES: Record<string, Translations> = { tr, en, de, es, fr, it, nl, pt, ru, ar };

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
