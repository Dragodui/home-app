import be from "./be";
import de from "./de";
import en from "./en";
import fr from "./fr";
import it from "./it";
import pl from "./pl";
import uk from "./uk";

export const translations = {
  en,
  pl,
  be,
  uk,
  de,
  fr,
  it,
} as const;

export type Language = keyof typeof translations;
export type Translations = typeof en;

export const languageNames: Record<Language, string> = {
  en: "English",
  pl: "Polski",
  be: "Беларуская",
  uk: "Українська",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
};

export const defaultLanguage: Language = "en";
