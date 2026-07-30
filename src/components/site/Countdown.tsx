import { useEffect, useState } from "react";

function diff(target: Date) {
  const ms = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms / 3600000) % 24),
    minutes: Math.floor((ms / 60000) % 60),
    seconds: Math.floor((ms / 1000) % 60),
  };
}

export function Countdown({ date }: { date: string }) {
  const target = new Date(`${date}T06:00:00`);
  const [left, setLeft] = useState(() => diff(target));

  useEffect(() => {
    const id = setInterval(() => setLeft(diff(new Date(`${date}T06:00:00`))), 1000);
    return () => clearInterval(id);
  }, [date]);

  const cells = [
    { v: left.days, l: "Days" },
    { v: left.hours, l: "Hours" },
    { v: left.minutes, l: "Mins" },
    { v: left.seconds, l: "Secs" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {cells.map((c) => (
        <div key={c.l} className="glass rounded-3xl px-2 py-3 text-center sm:px-4 sm:py-4">
          <div className="font-display text-2xl font-extrabold tabular-nums text-primary sm:text-4xl">
            {String(c.v).padStart(2, "0")}
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-xs">
            {c.l}
          </div>
        </div>
      ))}
    </div>
  );
}
