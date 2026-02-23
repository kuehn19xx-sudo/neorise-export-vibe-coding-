"use client";

import Link from "next/link";
import ReactCountryFlag from "react-country-flag";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { isSupportedLanguage, SUPPORTED_LANGUAGES, type AppLanguage } from "@/i18n/config";

type LanguageDropdownProps = {
  currentLang: AppLanguage;
};

const LANG_META: Record<AppLanguage, { name: string; country: string }> = {
  en: { name: "English", country: "US" },
  zh: { name: "Chinese", country: "CN" },
  fr: { name: "Français", country: "FR" },
  ar: { name: "العربية", country: "SA" },
  es: { name: "Español", country: "ES" },
  ru: { name: "Русский", country: "RU" },
};

function buildLanguageHref(pathname: string, targetLang: AppLanguage): string {
  const cleanPath = pathname.split("?")[0];
  const segments = cleanPath.split("/").filter(Boolean);

  if (segments.length === 0) return `/${targetLang}`;

  const first = segments[0];
  if (isSupportedLanguage(first)) {
    segments[0] = targetLang;
    return `/${segments.join("/")}`;
  }

  return `/${targetLang}`;
}

export function LanguageDropdown({ currentLang }: LanguageDropdownProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  const current = LANG_META[currentLang];
  const items = useMemo(
    () =>
      SUPPORTED_LANGUAGES.map((lang) => ({
        lang,
        ...LANG_META[lang],
        href: buildLanguageHref(pathname, lang),
      })),
    [pathname],
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <ReactCountryFlag countryCode={current.country} svg style={{ width: "16px", height: "16px" }} />
        <span>{current.name}</span>
        <span className="text-[10px] text-slate-500">▼</span>
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-[180px] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          {items.map((item) => {
            const active = item.lang === currentLang;
            return (
              <Link
                key={item.lang}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex min-h-9 items-center gap-3 rounded-md px-2.5 py-2 text-sm ${
                  active ? "bg-slate-100 text-slate-900" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <ReactCountryFlag countryCode={item.country} svg style={{ width: "16px", height: "16px" }} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
