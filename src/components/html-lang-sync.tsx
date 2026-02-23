"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { isSupportedLanguage } from "@/i18n/config";

export function HtmlLangSync() {
  const pathname = usePathname();

  useEffect(() => {
    const firstSegment = pathname.split("/").filter(Boolean)[0];
    const lang = isSupportedLanguage(firstSegment) ? firstSegment : "en";
    document.documentElement.lang = lang;
  }, [pathname]);

  return null;
}
