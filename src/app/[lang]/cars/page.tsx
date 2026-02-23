import { notFound } from "next/navigation";

import { CarsCatalog } from "@/components/cars-catalog";
import { getActiveCars } from "@/data/cars";
import { isSupportedLanguage, type AppLanguage } from "@/i18n/config";
import { getMessages } from "@/i18n/get-messages";

type CarsPageProps = {
  params: Promise<{ lang: string }>;
};

export default async function CarsPage({ params }: CarsPageProps) {
  const { lang } = await params;
  if (!isSupportedLanguage(lang)) {
    notFound();
  }

  const language = lang as AppLanguage;
  const isArabic = language === "ar";
  const messages = getMessages(language);
  const cars = getActiveCars();

  return (
    <section className="space-y-8">
      <div className="rounded-3xl bg-slate-100 px-5 py-8 sm:px-8">
        <h1
          dir={isArabic ? "rtl" : "ltr"}
          className={`text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl ${isArabic ? "text-right" : "text-left"}`}
        >
          {messages.cars.title}
        </h1>
        <p
          dir={isArabic ? "rtl" : "ltr"}
          className={`mt-3 text-sm text-slate-600 sm:text-base ${isArabic ? "text-right" : "text-left"}`}
        >
          {messages.cars.subtitle}
        </p>
      </div>
      <CarsCatalog cars={cars} lang={language} messages={messages} />
    </section>
  );
}
