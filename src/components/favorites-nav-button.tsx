"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import type { AppLanguage } from "@/i18n/config";
import { getFavoriteIds, getServerFavoriteIds, subscribeFavorites } from "@/lib/favorites";

type FavoritesNavButtonProps = {
  lang: AppLanguage;
  theme?: "light" | "dark";
};

export function FavoritesNavButton({ lang, theme = "light" }: FavoritesNavButtonProps) {
  const favoriteIds = useSyncExternalStore(subscribeFavorites, getFavoriteIds, getServerFavoriteIds);
  const hasFavorites = favoriteIds.length > 0;

  const className =
    theme === "dark"
      ? "inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 hover:border-slate-400"
      : "inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400";

  const heartClass = hasFavorites
    ? theme === "dark"
      ? "text-rose-400"
      : "text-rose-500"
    : theme === "dark"
      ? "text-slate-300"
      : "text-slate-500";

  return (
    <Link href={`/${lang}/favorites`} className={className}>
      <span className={heartClass}>{hasFavorites ? "❤️" : "🤍"}</span>
      <span>{favoriteIds.length}</span>
    </Link>
  );
}
