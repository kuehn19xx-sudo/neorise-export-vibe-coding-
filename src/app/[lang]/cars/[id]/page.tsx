import Link from "next/link";
import { notFound } from "next/navigation";

import { CarGallery } from "@/components/car-gallery";
import { FavoriteButton } from "@/components/favorite-button";
import { isSupportedLanguage, type AppLanguage } from "@/i18n/config";
import { getMessages } from "@/i18n/get-messages";
import { getCarByIdServer } from "@/lib/cars-server";

type CarDetailPageProps = {
  params: Promise<{ lang: string; id: string }>;
};

type SpecCell = {
  label: string;
  value: string;
};

type SpecRow = {
  left: SpecCell;
  right: SpecCell;
};

function createWhatsappLink(carTitle: string, carId: string) {
  const phone = "0000000000";
  const message = encodeURIComponent(`Hello NeoRise, I want this car: ${carTitle} (${carId})`);
  return `https://wa.me/${phone}?text=${message}`;
}

function toDisplay(value: unknown): string {
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text === "" ? "-" : text;
}

function pickSpec(lookup: Record<string, string>, keys: string[], fallback?: unknown): string {
  for (const key of keys) {
    const found = lookup[key.toLowerCase()];
    if (found && found.trim() !== "") {
      return found;
    }
  }
  return toDisplay(fallback);
}

function buildSpecRows(car: Awaited<ReturnType<typeof getCarByIdServer>>): SpecRow[] {
  if (!car) return [];

  const lookup = Object.fromEntries(
    Object.entries(car.specs ?? {}).map(([k, v]) => [k.toLowerCase(), String(v)]),
  );

  return [
    {
      left: { label: "Ref ID", value: pickSpec(lookup, ["ref_no", "ref id"], car.id) },
      right: { label: "Steering", value: pickSpec(lookup, ["steering"]) },
    },
    {
      left: { label: "Model Code", value: pickSpec(lookup, ["model code", "model_code", "code"]) },
      right: { label: "Body Type", value: pickSpec(lookup, ["body type", "body_type"]) },
    },
    {
      left: { label: "Model Year", value: pickSpec(lookup, ["model year", "model_year"], car.year) },
      right: { label: "Mlg(km)", value: pickSpec(lookup, ["mlg(km)", "fuel_mileage_km"], car.mileage) },
    },
    {
      left: {
        label: "Exterior Color",
        value: pickSpec(lookup, ["exterior color", "exterior_color", "color"]),
      },
      right: { label: "Fuel", value: pickSpec(lookup, ["fuel", "fuel_type_label"], car.fuel) },
    },
    {
      left: { label: "Engine", value: pickSpec(lookup, ["engine", "engine_label", "engine size", "engine_size"]) },
      right: { label: "Transmission", value: pickSpec(lookup, ["transmission", "transmission_label"], car.transmission) },
    },
    {
      left: { label: "Drivetrain", value: pickSpec(lookup, ["drivetrain", "drive_system", "drive", "drive type", "drive_type"]) },
      right: { label: "Batt.Cap.(kWh)", value: pickSpec(lookup, ["batt.cap.(kwh)", "battery", "battery capacity"]) },
    },
    {
      left: { label: "Range(km)", value: pickSpec(lookup, ["range(km)", "range_km", "range"]) },
      right: { label: "Motor Power(kW)", value: pickSpec(lookup, ["motor power(kw)", "motor_kw", "motor power", "power"]) },
    },
    {
      left: { label: "Seats", value: pickSpec(lookup, ["seats"]) },
      right: { label: "Doors", value: pickSpec(lookup, ["doors"]) },
    },
    {
      left: { label: "Dim.(mm)", value: pickSpec(lookup, ["dim.(mm)", "dimension", "dimensions"]) },
      right: { label: "M³", value: pickSpec(lookup, ["m³", "m3", "volume"]) },
    },
    {
      left: { label: "Weight(kg)", value: pickSpec(lookup, ["weight(kg)", "weight"]) },
      right: { label: "Max.Cap(kg)", value: pickSpec(lookup, ["max.cap(kg)", "max cap", "max capacity"]) },
    },
  ];
}

export default async function CarDetailPage({ params }: CarDetailPageProps) {
  const { lang, id } = await params;
  if (!isSupportedLanguage(lang)) {
    notFound();
  }

  const language = lang as AppLanguage;
  const isArabic = language === "ar";
  const messages = getMessages(language);
  const car = await getCarByIdServer(id);
  const specRows = buildSpecRows(car);

  if (!car || car.status !== "active") {
    notFound();
  }

  return (
    <section className="space-y-6">
      <Link href={`/${language}/cars`} className="text-sm text-slate-600 hover:text-slate-900">
        {"<-"} {messages.nav.cars}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <CarGallery images={car.images} title={car.title} />
          </div>

          {car.videoUrl ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2
                dir={isArabic ? "rtl" : "ltr"}
                className={`mb-4 text-lg font-semibold ${isArabic ? "text-right" : "text-left"}`}
              >
                {messages.carDetail.video}
              </h2>
              <div className="aspect-video overflow-hidden rounded-xl border border-slate-200">
                <iframe
                  src={car.videoUrl}
                  title={`${car.title} video`}
                  className="h-full w-full"
                  allowFullScreen
                />
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2
              dir={isArabic ? "rtl" : "ltr"}
              className={`mb-4 text-lg font-semibold ${isArabic ? "text-right" : "text-left"}`}
            >
              {messages.carDetail.specs}
            </h2>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full border-collapse text-sm text-slate-700">
                <tbody>
                  {specRows.map((row) => (
                    <tr key={`${row.left.label}-${row.right.label}`} className="border-b border-slate-200 last:border-b-0">
                      <th className="w-1/4 bg-slate-100 px-3 py-2 text-left font-semibold text-slate-700">
                        {row.left.label}
                      </th>
                      <td className="w-1/4 px-3 py-2 text-slate-900">{row.left.value}</td>
                      <th className="w-1/4 bg-slate-100 px-3 py-2 text-left font-semibold text-slate-700">
                        {row.right.label}
                      </th>
                      <td className="w-1/4 px-3 py-2 text-slate-900">{row.right.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className={isArabic ? "pr-2" : "pl-2"}>
                <h1
                  dir={isArabic ? "rtl" : "ltr"}
                  className={`text-2xl font-bold text-slate-900 ${isArabic ? "text-right" : "text-left"}`}
                >
                  {car.title}
                </h1>
                <p
                  dir={isArabic ? "rtl" : "ltr"}
                  className={`mt-1 text-lg font-semibold text-slate-800 ${isArabic ? "text-right" : "text-left"}`}
                >
                  {car.currency} {car.price.toLocaleString("en-US")}
                </p>
              </div>
              <FavoriteButton
                carId={car.id}
                addLabel={messages.cars.addFavorite}
                removeLabel={messages.cars.removeFavorite}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2
              dir={isArabic ? "rtl" : "ltr"}
              className={`text-lg font-semibold ${isArabic ? "text-right" : "text-left"}`}
            >
              {messages.carDetail.contactNow}
            </h2>
            <a
              href={createWhatsappLink(car.title, car.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-500"
            >
              {messages.carDetail.whatsapp}
            </a>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2
              dir={isArabic ? "rtl" : "ltr"}
              className={`mb-4 text-lg font-semibold ${isArabic ? "text-right" : "text-left"}`}
            >
              {messages.carDetail.inquiry}
            </h2>
            <form className="space-y-3">
              <label className="block space-y-1 text-sm">
                <span>{messages.carDetail.name}</span>
                <input
                  type="text"
                  placeholder={messages.carDetail.placeholderName}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{messages.carDetail.country}</span>
                <input
                  type="text"
                  placeholder={messages.carDetail.placeholderCountry}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{messages.carDetail.whatsapp}</span>
                <input
                  type="text"
                  placeholder={messages.carDetail.placeholderWhatsapp}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span>{messages.carDetail.message}</span>
                <textarea
                  rows={4}
                  placeholder={messages.carDetail.placeholderMessage}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
              <button
                type="button"
                className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white"
              >
                {messages.carDetail.submit}
              </button>
            </form>
          </div>
        </aside>
      </div>
    </section>
  );
}



