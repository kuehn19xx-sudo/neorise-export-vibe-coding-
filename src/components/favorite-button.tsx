"use client";

import { useSyncExternalStore } from "react";

import { getFavoriteIds, getServerFavoriteIds, subscribeFavorites, toggleFavorite } from "@/lib/favorites";

type FavoriteButtonProps = {
  carId: string;
  addLabel: string;
  removeLabel: string;
  onChange?: () => void;
};

export function FavoriteButton({ carId, addLabel, removeLabel, onChange }: FavoriteButtonProps) {
  const favoriteIds = useSyncExternalStore(subscribeFavorites, getFavoriteIds, getServerFavoriteIds);
  const active = favoriteIds.includes(carId);

  return (
    <button
      type="button"
      aria-label={active ? removeLabel : addLabel}
      onClick={() => {
        toggleFavorite(carId);
        onChange?.();
      }}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white text-lg transition hover:border-slate-500 ${
        active ? "border-rose-300 text-rose-500" : "border-slate-300 text-slate-500"
      }`}
    >
      {active ? "❤️" : "🤍"}
    </button>
  );
}
