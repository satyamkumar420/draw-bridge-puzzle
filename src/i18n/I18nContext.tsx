import type React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { LanguageCode, TranslationKeys } from './types.ts';
import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  matchBcp47ToLanguageCode,
  getUrlLanguageParam
} from './languages.ts';
import { translations, en } from './translations/index.ts';
import { safeStorage } from '../services/storage.ts';
import { youtubePlayables } from '../services/youtubePlayables.ts';
import { I18nContext } from './context.ts';

const STORAGE_KEY = 'game_language';
const MANUAL_OVERRIDE_KEY = 'game_language_manual_override';

export interface I18nProviderProps {
  children: React.ReactNode;
  initialLanguage?: LanguageCode;
  onLanguageChange?: (lang: LanguageCode) => void;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
  children,
  initialLanguage,
  onLanguageChange
}) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (initialLanguage) return initialLanguage;

    // 1. First priority: check URL parameters (?lang=, ?locale=, ?hl=, ?language=)
    const urlLang = getUrlLanguageParam();
    if (urlLang) {
      return matchBcp47ToLanguageCode(urlLang);
    }

    // 2. Check if user explicitly changed and saved language previously
    const hasManual = safeStorage.getItem(MANUAL_OVERRIDE_KEY);
    if (hasManual) {
      const saved = safeStorage.getItem(STORAGE_KEY);
      if (saved) return matchBcp47ToLanguageCode(saved);
    }

    // 3. Fallback to navigator.language
    if (typeof navigator !== 'undefined' && navigator.language) {
      return matchBcp47ToLanguageCode(navigator.language);
    }

    return DEFAULT_LANGUAGE;
  });

  // On boot and on platform language change, sync with YouTube Playables
  useEffect(() => {
    let isMounted = true;

    // 1. Query YouTube Playables platform language / URL parameter
    youtubePlayables
      .getLanguage()
      .then((ytLang) => {
        if (!isMounted || !ytLang) return;
        const hasManual = safeStorage.getItem(MANUAL_OVERRIDE_KEY);
        // If user hasn't manually selected language in-game, apply YouTube platform language
        if (!hasManual) {
          const matched = matchBcp47ToLanguageCode(ytLang);
          setLanguageState(matched);
        }
      })
      .catch((err) => {
        console.warn('Failed to query YouTube language', err);
      });

    // 2. Check YouTube Playables Cloud Storage save data
    youtubePlayables
      .loadData(1000)
      .then((cloudData) => {
        if (!isMounted) return;
        if (cloudData && typeof cloudData.language === 'string' && cloudData.language.trim().length > 0) {
          const cloudLang = matchBcp47ToLanguageCode(cloudData.language);
          setLanguageState(cloudLang);
          safeStorage.setItem(STORAGE_KEY, cloudLang);
          safeStorage.setItem(MANUAL_OVERRIDE_KEY, 'true');
        }
      })
      .catch((err) => {
        console.warn('Failed to load cloud language', err);
      });

    // 3. Realtime listener for YouTube Test Tool or platform language updates
    const unsubLang = youtubePlayables.onLanguageChange((newLocale) => {
      if (!isMounted || !newLocale) return;
      const matched = matchBcp47ToLanguageCode(newLocale);
      setLanguageState(matched);
    });

    return () => {
      isMounted = false;
      unsubLang();
    };
  }, []);

  const currentLanguageMeta = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[2];
  }, [language]);

  const isRTL = currentLanguageMeta.dir === 'rtl';

  // Apply HTML document dir and lang attributes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    }
  }, [language, isRTL]);

  const setLanguage = useCallback(
    (newLang: LanguageCode) => {
      setLanguageState(newLang);
      safeStorage.setItem(STORAGE_KEY, newLang);
      safeStorage.setItem(MANUAL_OVERRIDE_KEY, 'true');
      onLanguageChange?.(newLang);

      // Immediately write new language to YouTube Playables Cloud Save
      youtubePlayables.saveData({
        unlockedIndex: 0,
        cash: 0,
        language: newLang
      });
    },
    [onLanguageChange]
  );

  const t = useCallback(
    (key: keyof TranslationKeys, params?: Record<string, string | number>): string => {
      const activeDict = translations[language] || translations[DEFAULT_LANGUAGE];
      let str = activeDict[key] || en[key] || String(key);

      if (params) {
        Object.entries(params).forEach(([placeholder, value]) => {
          str = str.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), String(value));
        });
      }

      return str;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      isRTL,
      languages: SUPPORTED_LANGUAGES,
      currentLanguageMeta
    }),
    [language, setLanguage, t, isRTL, currentLanguageMeta]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
