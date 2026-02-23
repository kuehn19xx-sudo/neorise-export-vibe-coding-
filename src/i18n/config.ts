export const SUPPORTED_LANGUAGES = ["en", "zh", "fr", "ar", "es", "ru"] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = "en";

export function isSupportedLanguage(value: string): value is AppLanguage {
  return SUPPORTED_LANGUAGES.includes(value as AppLanguage);
}

export function getDirection(lang: AppLanguage): "ltr" | "rtl" {
  return lang === "ar" ? "rtl" : "ltr";
}
