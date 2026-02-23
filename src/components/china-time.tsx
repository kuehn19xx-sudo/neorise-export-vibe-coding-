"use client";

import { useEffect, useMemo, useState } from "react";

function formatChinaTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

export function ChinaTime() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const label = useMemo(() => (now ? formatChinaTime(now) : "--/--/----, --:--:--"), [now]);

  return <span className="text-xs font-medium text-slate-300">CN Time {label}</span>;
}
