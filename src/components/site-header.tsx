import Link from "next/link";

import { ChinaTime } from "@/components/china-time";
import { FavoritesNavButton } from "@/components/favorites-nav-button";
import { LanguageDropdown } from "@/components/language-dropdown";
import { SiteLogo } from "@/components/site-logo";
import type { AppLanguage } from "@/i18n/config";

type SiteHeaderProps = {
  lang: AppLanguage;
};

export function SiteHeader({ lang }: SiteHeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-[#0B0F19]">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-3 sm:px-6 lg:px-8">
        <div className="flex h-9 items-center">
          <Link href={`/${lang}`} className="flex h-9 items-center">
            <SiteLogo />
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <input
            type="search"
            placeholder="Search make / model"
            aria-label="Search"
            className="h-9 w-[170px] rounded-full border border-slate-600 bg-slate-900 px-4 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-400 focus:border-[#ff7a1a] sm:w-[220px]"
          />
          <FavoritesNavButton lang={lang} theme="dark" />
          <LanguageDropdown currentLang={lang} />
          <ChinaTime />
        </div>
      </div>
    </header>
  );
}
