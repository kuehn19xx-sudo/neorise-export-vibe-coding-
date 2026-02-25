import Link from "next/link";

import type { CarRecord } from "@/data/cars";
import type { AppLanguage } from "@/i18n/config";
import type { Messages } from "@/i18n/messages/types";

import { CarImage } from "./car-image";
import { FavoriteButton } from "./favorite-button";

type CarCardProps = {
  car: CarRecord;
  lang: AppLanguage;
  messages: Messages;
  onFavoriteChanged?: () => void;
};

export function CarCard({ car, lang, messages, onFavoriteChanged }: CarCardProps) {
  const drive = car.specs.Drive ?? car.specs.drive ?? "-";
  const detailHref = `/${lang}/cars/${car.id}`;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
      <Link href={detailHref} className="block">
        <CarImage
          src={car.images[0]}
          alt={car.title}
          width={460}
          height={260}
          className="h-48 w-full rounded-2xl bg-slate-100 object-cover"
        />
      </Link>
      <div className="flex h-full flex-col gap-4 p-2 pt-4">
        <div className="flex min-h-[64px] items-start justify-between gap-3">
          <h3 className="line-clamp-2 min-w-0 flex-1 text-lg font-semibold leading-7 text-slate-900">{car.title}</h3>
          <p className="shrink-0 whitespace-nowrap text-right text-lg font-bold text-[#ff7a1a]">
            {car.currency} {car.price.toLocaleString("en-US")}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-sm text-slate-700">
          <div className="flex min-h-[62px] flex-col justify-center rounded-xl bg-slate-100 px-3 py-2">
            <span>{messages.cars.mileage}: {car.mileage.toLocaleString("en-US")}</span>
            <span className="leading-5">km</span>
          </div>
          <div className="flex min-h-[62px] items-center rounded-xl bg-slate-100 px-3 py-2">
            {messages.cars.fuel}: {car.fuel}
          </div>
          <div className="flex min-h-[62px] items-center rounded-xl bg-slate-100 px-3 py-2">Drive: {drive}</div>
          <div className="flex min-h-[62px] items-center rounded-xl bg-slate-100 px-3 py-2">
            {messages.cars.year}: {car.year}
          </div>
        </dl>

        <div className="mt-auto flex items-center gap-3">
          <Link
            href={detailHref}
            className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-[#ff7a1a] px-4 text-sm font-medium text-white transition hover:bg-[#ff8e3a]"
          >
            {messages.cars.details}
          </Link>
          <div className="flex h-12 w-12 items-center justify-center">
            <FavoriteButton
              carId={car.id}
              addLabel={messages.cars.addFavorite}
              removeLabel={messages.cars.removeFavorite}
              onChange={onFavoriteChanged}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
