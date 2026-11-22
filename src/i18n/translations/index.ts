import type { LanguageCode, TranslationKeys } from '../types.ts';
import { ar } from './ar.ts';
import { de } from './de.ts';
import { en } from './en.ts';
import { es } from './es.ts';
import { fr } from './fr.ts';
import { hi } from './hi.ts';
import { id } from './id.ts';
import { it } from './it.ts';
import { ja } from './ja.ts';
import { ko } from './ko.ts';
import { ms } from './ms.ts';
import { nl } from './nl.ts';
import { pt } from './pt.ts';
import { ro } from './ro.ts';
import { ru } from './ru.ts';
import { th } from './th.ts';
import { tr } from './tr.ts';
import { uk } from './uk.ts';
import { vi } from './vi.ts';
import { zhHans } from './zh-Hans.ts';
import { zhHant } from './zh-Hant.ts';

export const translations: Record<LanguageCode, TranslationKeys> = {
  ar,
  de,
  en,
  es,
  fr,
  hi,
  id,
  it,
  ja,
  ko,
  ms,
  nl,
  pt,
  ro,
  ru,
  th,
  tr,
  uk,
  vi,
  'zh-Hans': zhHans,
  'zh-Hant': zhHant
};

export {
  ar,
  de,
  en,
  es,
  fr,
  hi,
  id,
  it,
  ja,
  ko,
  ms,
  nl,
  pt,
  ro,
  ru,
  th,
  tr,
  uk,
  vi,
  zhHans,
  zhHant
};
