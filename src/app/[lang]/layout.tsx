import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { isSupportedLanguage, type AppLanguage } from "@/i18n/config";

type LangLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

export default async function LangLayout({ children, params }: LangLayoutProps) {
  const { lang } = await params;
  if (!isSupportedLanguage(lang)) {
    notFound();
  }

  const language = lang as AppLanguage;
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader lang={language} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
