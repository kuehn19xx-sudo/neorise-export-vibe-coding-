import { notFound } from "next/navigation";

import { FavoritesList } from "@/components/favorites-list";
import { isSupportedLanguage, type AppLanguage } from "@/i18n/config";
import { getMessages } from "@/i18n/get-messages";
import { getActiveCarsServer } from "@/lib/cars-server";

type FavoritesPageProps = {
  params: Promise<{ lang: string }>;
};

export default async function FavoritesPage({ params }: FavoritesPageProps) {
  const { lang } = await params;
  if (!isSupportedLanguage(lang)) {
    notFound();
  }

  const language = lang as AppLanguage;
  const isArabic = language === "ar";
  const messages = getMessages(language);
  const cars = await getActiveCarsServer();

  return (
    <section className="space-y-6">
      <div>
        <h1
          dir={isArabic ? "rtl" : "ltr"}
          className={`text-3xl font-bold text-slate-900 ${isArabic ? "text-right" : "text-left"}`}
        >
          {messages.favorites.title}
        </h1>
        <p
          dir={isArabic ? "rtl" : "ltr"}
          className={`mt-2 text-slate-600 ${isArabic ? "text-right" : "text-left"}`}
        >
          {messages.favorites.subtitle}
        </p>
      </div>
      <FavoritesList cars={cars} lang={language} messages={messages} />
    </section>
  );
}
