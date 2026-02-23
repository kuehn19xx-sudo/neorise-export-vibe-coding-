import Link from "next/link";
import { notFound } from "next/navigation";

import { isSupportedLanguage, type AppLanguage } from "@/i18n/config";
import { getMessages } from "@/i18n/get-messages";

type LangHomePageProps = {
  params: Promise<{ lang: string }>;
};

export default async function LangHomePage({ params }: LangHomePageProps) {
  const { lang } = await params;
  if (!isSupportedLanguage(lang)) {
    notFound();
  }

  const language = lang as AppLanguage;
  const isArabic = language === "ar";
  const messages = getMessages(language);

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1
          dir={isArabic ? "rtl" : "ltr"}
          className={`max-w-2xl text-3xl font-bold tracking-tight text-slate-900 ${isArabic ? "text-right" : "text-left"}`}
        >
          {messages.home.title}
        </h1>
        <p
          dir={isArabic ? "rtl" : "ltr"}
          className={`mt-3 max-w-2xl text-slate-600 ${isArabic ? "text-right" : "text-left"}`}
        >
          {messages.home.subtitle}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/${language}/cars`}
            className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700"
          >
            {messages.home.ctaBrowse}
          </Link>
          <Link
            href={`/${language}/favorites`}
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-800 hover:border-slate-500"
          >
            {messages.home.ctaFavorites}
          </Link>
        </div>
      </div>
    </section>
  );
}
