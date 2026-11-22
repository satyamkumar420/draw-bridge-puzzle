import type { LanguageCode, LanguageMeta } from './types.ts';

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'zh-Hans', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-Hant', name: 'Chinese (Traditional)', nativeName: '繁體中文' }
];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

/**
 * Extracts language code from URL query parameters (?lang=, ?locale=, ?hl=, ?language=)
 * Checks both window.location.search and window.location.hash.
 */
export function getUrlLanguageParam(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const fromSearch =
      searchParams.get('lang') ||
      searchParams.get('locale') ||
      searchParams.get('hl') ||
      searchParams.get('language');
    if (fromSearch && fromSearch.trim().length > 0) {
      return fromSearch.trim();
    }

    if (window.location.hash && window.location.hash.includes('?')) {
      const hashQuery = window.location.hash.substring(window.location.hash.indexOf('?'));
      const hashParams = new URLSearchParams(hashQuery);
      const fromHash =
        hashParams.get('lang') ||
        hashParams.get('locale') ||
        hashParams.get('hl') ||
        hashParams.get('language');
      if (fromHash && fromHash.trim().length > 0) {
        return fromHash.trim();
      }
    }
  } catch (err) {
    console.warn('Failed to parse language from URL params', err);
  }
  return null;
}

/**
 * Maps standard BCP-47 tag (from ytgame.system.getLanguage() or navigator.language)
 * to one of our 21 supported language codes.
 */
export function matchBcp47ToLanguageCode(rawLocale?: string): LanguageCode {
  if (!rawLocale || typeof rawLocale !== 'string') return DEFAULT_LANGUAGE;

  const normalized = rawLocale.trim().toLowerCase().replace('_', '-');

  // Exact matches first
  if (normalized === 'zh-hant' || normalized === 'zh-tw' || normalized === 'zh-hk' || normalized === 'zh-mo') {
    return 'zh-Hant';
  }
  if (normalized === 'zh-hans' || normalized === 'zh-cn' || normalized === 'zh-sg' || normalized.startsWith('zh')) {
    return 'zh-Hans';
  }

  // Check 2-letter prefix or exact match
  const primary = normalized.split('-')[0];

  const matched = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code.toLowerCase() === normalized || lang.code.toLowerCase() === primary
  );

  return matched ? matched.code : DEFAULT_LANGUAGE;
}

