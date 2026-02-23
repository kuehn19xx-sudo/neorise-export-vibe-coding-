import Link from "next/link";

import { SUPPORTED_LANGUAGES, type AppLanguage } from "@/i18n/config";

type LanguageSwitcherProps = {
  currentLang: AppLanguage;
  pathnameSuffix?: string;
  compact?: boolean;
  theme?: "light" | "dark";
};

export function LanguageSwitcher({
  currentLang,
  pathnameSuffix = "",
  compact = false,
  theme = "light",
}: LanguageSwitcherProps) {
  const activeClass =
    theme === "dark"
      ? "border-[#ff7a1a] bg-[#ff7a1a] text-white"
      : "border-slate-900 bg-slate-900 text-white";
  const inactiveClass =
    theme === "dark"
      ? "border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-400"
      : "border-slate-300 bg-white text-slate-600";

  return (
    <div
      className={`flex flex-wrap items-center ${compact ? "gap-1 text-[11px]" : "gap-2 text-xs"} ${
        theme === "dark" ? "text-slate-200" : "text-slate-600"
      }`}
    >
      {SUPPORTED_LANGUAGES.map((lang) => {
        const active = lang === currentLang;
        return (
          <Link
            key={lang}
            href={`/${lang}${pathnameSuffix}`}
            className={`rounded border uppercase ${
              compact ? "px-1.5 py-1" : "px-2 py-1"
            } ${active ? activeClass : inactiveClass}`}
          >
            {lang}
          </Link>
        );
      })}
    </div>
  );
}
