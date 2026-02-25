"use client";

import { useEffect, useMemo, useState } from "react";

function formatChinaTime(date: Date) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    hour12: true,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return formatted.toLowerCase();
}

export function ChinaTime() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const label = useMemo(() => (now ? formatChinaTime(now) : "--:-- am"), [now]);

  return <span className="text-xs font-medium text-slate-300">CN TIME:{label}</span>;
}
