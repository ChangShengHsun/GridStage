import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { en } from './en';
import { zh } from './zh';

/**
 * Tiny typed i18n. `en.ts` defines the shape; every other dictionary is
 * declared `: Messages`, so a missing or mis-typed string is a compile
 * error — no runtime fallback logic needed. Adding a language = one new
 * file + one entry in DICTIONARIES + one <option> in the TopBar switcher.
 *
 * ponytail: no i18n library — two locales and flat access (`t.cast.title`)
 * don't need one. Reach for a lib only if plurals/genders get complicated.
 */

export type Messages = typeof en;
export type Locale = 'en' | 'zh';

const DICTIONARIES: Record<Locale, Messages> = { en, zh };

function browserDefault(): Locale {
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')
    ? 'zh'
    : 'en';
}

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist((set) => ({ locale: browserDefault(), setLocale: (locale) => set({ locale }) }), {
    name: 'openstage-locale',
  }),
);

/** React components: current dictionary, re-renders on language change. */
export function useT(): Messages {
  return DICTIONARIES[useLocaleStore((s) => s.locale)];
}

/** Non-React code (exporters, one-off handlers): current dictionary. */
export function messages(): Messages {
  return DICTIONARIES[useLocaleStore.getState().locale];
}
