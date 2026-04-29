"use client";

import { useMemo, useState } from "react";

type Props = {
  stats: Record<string, number>;
};

const STATUS_ORDER = ["pending", "processing", "packed", "shipped", "delivered", "cancelled"];

const STATUS_COLORS: Record<string, string> = {
  pending: "#d97706",
  processing: "#2563eb",
  packed: "#7c3aed",
  shipped: "#6366f1",
  delivered: "#059669",
  cancelled: "#dc2626",
};

const FALLBACK_PALETTE = [
  "#0f766e",
  "#a16207",
  "#7c3aed",
  "#db2777",
  "#0ea5e9",
];

function colorFor(status: string, idx: number): string {
  return STATUS_COLORS[status.toLowerCase()] ?? FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = ((startDeg - 90) * Math.PI) / 180;
  const end = ((endDeg - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

export function OrderStatusDonut({ stats }: Props) {
  const entries = useMemo(() => {
    const known = STATUS_ORDER
      .filter((k) => (stats[k] ?? 0) > 0)
      .map((k) => [k, stats[k]] as const);
    const extras = Object.entries(stats)
      .filter(([k, v]) => v > 0 && !STATUS_ORDER.includes(k))
      .map(([k, v]) => [k, v] as const);
    return [...known, ...extras];
  }, [stats]);

  const total = useMemo(
    () => entries.reduce((acc, [, v]) => acc + v, 0),
    [entries]
  );
  const [hover, setHover] = useState<string | null>(null);

  if (total === 0) {
    return <p className="mt-3 text-small text-kofkan-text-muted">No orders in range.</p>;
  }

  const size = 176;
  const cx = size / 2;
  const cy = size / 2;
  const r = 68;
  const stroke = 18;

  let cursor = 0;
  const arcs = entries.map(([key, value], i) => {
    const pct = value / total;
    const start = cursor * 360;
    const end = (cursor + pct) * 360;
    cursor += pct;
    return {
      key,
      value,
      pct,
      color: colorFor(key, i),
      d: describeArc(cx, cy, r, start, Math.min(end, 359.999)),
    };
  });

  const hovered = hover ? entries.find(([k]) => k === hover) : null;

  return (
    <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label="Orders by status">
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth={stroke}
          />
          {arcs.map((a) => (
            <path
              key={a.key}
              d={a.d}
              fill="none"
              stroke={a.color}
              strokeWidth={hover === a.key ? stroke + 3 : stroke}
              strokeLinecap="butt"
              onMouseEnter={() => setHover(a.key)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer", transition: "stroke-width 120ms ease" }}
            />
          ))}
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="11"
            fill="currentColor"
            className="text-kofkan-text-muted"
          >
            {hovered ? hovered[0] : "Total"}
          </text>
          <text
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="20"
            fontWeight="600"
            fill="currentColor"
            className="text-kofkan-text-primary"
          >
            {hovered ? hovered[1] : total}
          </text>
        </svg>
      </div>

      <ul className="flex-1 space-y-1.5">
        {arcs.map((a) => {
          const label = a.key.replace(/_/g, " ");
          const pct = Math.round(a.pct * 100);
          return (
            <li
              key={a.key}
              className={`flex items-center justify-between gap-3 rounded-md px-2 py-1 text-small transition-colors ${
                hover === a.key ? "bg-kofkan-cream" : ""
              }`}
              onMouseEnter={() => setHover(a.key)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: a.color }}
                />
                <span className="truncate capitalize text-kofkan-text-secondary">{label}</span>
              </span>
              <span className="shrink-0 text-[11px] font-semibold text-kofkan-text-primary tabular-nums">
                {a.value}
                <span className="ml-1 font-normal text-kofkan-text-muted">({pct}%)</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
