"use client";

import { useEffect, useState } from "react";

function formatNow(date: Date): string {
  const datePart = date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return `${datePart} • ${timePart}`;
}

export default function LiveClock({ className = "" }: { className?: string }) {
  // Start null so SSR and the first client render match; fill in after mount.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);

    return () => clearInterval(id);
  }, []);

  return (
    <p
      suppressHydrationWarning
      className={`flex items-center gap-1.5 font-mono text-xs text-slate-400 dark:text-slate-500 ${className}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-500" />
      <span className="truncate">{now ? formatNow(now) : "Loading clock…"}</span>
    </p>
  );
}
