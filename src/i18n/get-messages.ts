import { DEFAULT_LANGUAGE, type AppLanguage } from "./config";
import { arMessages } from "./messages/ar";
import { enMessages } from "./messages/en";
import { esMessages } from "./messages/es";
import { frMessages } from "./messages/fr";
import { ruMessages } from "./messages/ru";
import type { Messages } from "./messages/types";
import { zhMessages } from "./messages/zh";

const MESSAGES_BY_LANG: Record<AppLanguage, Messages> = {
  en: enMessages,
  zh: zhMessages,
  fr: frMessages,
  ar: arMessages,
  es: esMessages,
  ru: ruMessages,
};

export function getMessages(lang: AppLanguage): Messages {
  return MESSAGES_BY_LANG[lang] ?? MESSAGES_BY_LANG[DEFAULT_LANGUAGE];
}
