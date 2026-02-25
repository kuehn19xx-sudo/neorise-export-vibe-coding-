import type { CarRecord } from "@/data/cars";
import type { AppLanguage } from "@/i18n/config";
import type { Messages } from "@/i18n/messages/types";

import { CarCard } from "./car-card";

type CarsCatalogProps = {
  cars: CarRecord[];
  lang: AppLanguage;
  messages: Messages;
};

export function CarsCatalog({ cars, lang, messages }: CarsCatalogProps) {
  const visibleCars = cars;

  return (
    <div className="space-y-6">
      {visibleCars.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          {messages.cars.empty}
        </p>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {visibleCars.map((car) => (
          <CarCard key={car.id} car={car} lang={lang} messages={messages} />
        ))}
      </div>
    </div>
  );
}
