import Link from "next/link";
import Image from "next/image";

import type { CarRecord } from "@/data/cars";
import type { AppLanguage } from "@/i18n/config";
import type { Messages } from "@/i18n/messages/types";

import { FavoriteButton } from "./favorite-button";

type CarCardProps = {
  car: CarRecord;
  lang: AppLanguage;
  messages: Messages;
  onFavoriteChanged?: () => void;
};

export function CarCard({ car, lang, messages, onFavoriteChanged }: CarCardProps) {
  const drive = car.specs.Drive ?? car.specs.drive ?? "-";

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
      <Image
        src={car.images[0]}
        alt={car.title}
        width={460}
        height={260}
        className="h-48 w-full rounded-2xl bg-slate-100 object-cover"
      />
      <div className="space-y-4 p-2 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="truncate text-lg font-semibold text-slate-900">{car.title}</h3>
          <p className="text-lg font-bold text-[#ff7a1a]">
            {car.currency} {car.price.toLocaleString("en-US")}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-sm text-slate-700">
          <div className="rounded-xl bg-slate-100 px-3 py-2">
            {messages.cars.mileage}: {car.mileage.toLocaleString("en-US")} km
          </div>
          <div className="rounded-xl bg-slate-100 px-3 py-2">
            {messages.cars.fuel}: {car.fuel}
          </div>
          <div className="rounded-xl bg-slate-100 px-3 py-2">Drive: {drive}</div>
          <div className="rounded-xl bg-slate-100 px-3 py-2">{messages.cars.year}: {car.year}</div>
        </dl>

        <div className="flex items-center gap-3">
          <Link
            href={`/${lang}/cars/${car.id}`}
            className="inline-flex flex-1 justify-center rounded-xl bg-[#ff7a1a] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#ff8e3a]"
          >
            {messages.cars.details}
          </Link>
          <FavoriteButton
            carId={car.id}
            addLabel={messages.cars.addFavorite}
            removeLabel={messages.cars.removeFavorite}
            onChange={onFavoriteChanged}
          />
        </div>
      </div>
    </article>
  );
}
