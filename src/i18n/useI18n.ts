import { useContext } from 'react';
import type { TranslationKeys } from './types.ts';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from './languages.ts';
import { en } from './translations/index.ts';
import { I18nContext, type I18nContextValue } from './context.ts';

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Graceful fallback for components or tests outside provider
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => {},
      t: (key: keyof TranslationKeys, params?: Record<string, string | number>) => {
        let str = en[key] || String(key);
        if (params) {
          Object.entries(params).forEach(([placeholder, value]) => {
            str = str.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), String(value));
          });
        }
        return str;
      },
      isRTL: false,
      languages: SUPPORTED_LANGUAGES,
      currentLanguageMeta: SUPPORTED_LANGUAGES[2]
    };
  }
  return ctx;
}
