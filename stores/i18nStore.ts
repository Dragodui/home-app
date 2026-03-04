import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { defaultLanguage, type Language, languageNames, type Translations, translations } from "@/lib/i18n";

const I18N_STORAGE_KEY = "@app_language";

interface I18nState {
  language: Language;
  t: Translations;
  languageNames: typeof languageNames;
  availableLanguages: Language[];
  isLoaded: boolean;
  init: () => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
}

export const useI18nStore = create<I18nState>((set) => ({
  language: defaultLanguage,
  t: translations[defaultLanguage],
  languageNames,
  availableLanguages: Object.keys(translations) as Language[],
  isLoaded: false,

  init: async () => {
    try {
      const saved = await AsyncStorage.getItem(I18N_STORAGE_KEY);
      if (saved && saved in translations) {
        const lang = saved as Language;
        set({ language: lang, t: translations[lang] });
      }
    } catch (error) {
      console.error("Failed to load language:", error);
    } finally {
      set({ isLoaded: true });
    }
  },

  setLanguage: async (lang: Language) => {
    try {
      await AsyncStorage.setItem(I18N_STORAGE_KEY, lang);
      set({ language: lang, t: translations[lang] });
    } catch (error) {
      console.error("Failed to save language:", error);
    }
  },
}));

// Convenience hook matching existing API
export function useI18n() {
  return useI18nStore();
}

// Re-export interpolation helper
export function interpolate(text: string, params: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key]?.toString() ?? match;
  });
}
