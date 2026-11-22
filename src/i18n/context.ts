import { createContext } from 'react';
import type { LanguageCode, TranslationKeys, LanguageMeta } from './types.ts';

export interface I18nContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: keyof TranslationKeys, params?: Record<string, string | number>) => string;
  isRTL: boolean;
  languages: LanguageMeta[];
  currentLanguageMeta: LanguageMeta;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
