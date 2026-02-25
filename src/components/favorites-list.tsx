"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import type { CarRecord } from "@/data/cars";
import type { AppLanguage } from "@/i18n/config";
import type { Messages } from "@/i18n/messages/types";
import { getFavoriteIds, getServerFavoriteIds, subscribeFavorites } from "@/lib/favorites";

import { CarCard } from "./car-card";

type FavoritesListProps = {
  cars: CarRecord[];
  lang: AppLanguage;
  messages: Messages;
};

export function FavoritesList({ cars, lang, messages }: FavoritesListProps) {
  const favoriteIds = useSyncExternalStore(subscribeFavorites, getFavoriteIds, getServerFavoriteIds);

  const favoriteCars = cars.filter((car) => favoriteIds.includes(car.id));

  if (favoriteCars.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm text-slate-600">{messages.favorites.empty}</p>
        <Link
          href={`/${lang}/cars`}
          className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          {messages.favorites.browseCars}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {favoriteCars.map((car) => (
        <CarCard key={car.id} car={car} lang={lang} messages={messages} />
      ))}
    </div>
  );
}
