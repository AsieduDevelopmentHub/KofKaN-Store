"use client";

import { useMemo, useState } from "react";
import type { RevenueStat } from "@/lib/api/admin";
import { formatGhs } from "@/lib/mock-data";

type Props = {
  stats: RevenueStat[];
  /** Number of most-recent days to show (default 30). */
  window?: number;
};

const WIDTH = 640;
const HEIGHT = 220;
const PADDING = { top: 16, right: 16, bottom: 28, left: 44 };

function niceCeil(v: number): number {
  if (v <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const norm = v / pow;
  if (norm <= 1) return 1 * pow;
  if (norm <= 2) return 2 * pow;
  if (norm <= 5) return 5 * pow;
  return 10 * pow;
}

function fmtShort(v: number): string {
  if (v >= 1_000_000) return `₵${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₵${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}k`;
  return `₵${Math.round(v)}`;
}

function fmtDateShort(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export function RevenueTrendChart({ stats, window = 30 }: Props) {
  const data = useMemo(() => stats.slice(-window), [stats, window]);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const innerW = WIDTH - PADDING.left - PADDING.right;
  const innerH = HEIGHT - PADDING.top - PADDING.bottom;

  const max = useMemo(() => {
    const m = Math.max(0, ...data.map((s) => s.revenue));
    return niceCeil(m || 1);
  }, [data]);

  const yTicks = 4;
  const tickValues = useMemo(
    () => Array.from({ length: yTicks + 1 }, (_, i) => (max / yTicks) * i),
    [max]
  );

  const xFor = (i: number) =>
    data.length <= 1
      ? PADDING.left + innerW / 2
      : PADDING.left + (i / (data.length - 1)) * innerW;
  const yFor = (v: number) => PADDING.top + innerH - (v / max) * innerH;

  const points = data.map((s, i) => `${xFor(i)},${yFor(s.revenue)}`).join(" ");
  const areaPath =
    data.length > 0
      ? `M ${xFor(0)},${yFor(0)} L ${data
          .map((s, i) => `${xFor(i)},${yFor(s.revenue)}`)
          .join(" L ")} L ${xFor(data.length - 1)},${yFor(0)} Z`
      : "";

  const hovered = hoverIdx != null && data[hoverIdx] ? data[hoverIdx] : null;
  const isEmpty = data.length === 0;

  return (
    <div className="w-full">
      <div
        className="relative w-full overflow-hidden"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="block h-48 w-full sm:h-56"
          role="img"
          aria-label="Revenue trend"
        >
          <defs>
            <linearGradient id="sk-rev-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>

          {tickValues.map((t, i) => (
            <g key={`tick-${i}`} className="text-kofkan-text-muted">
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={yFor(t)}
                y2={yFor(t)}
                stroke="currentColor"
                strokeOpacity="0.12"
                strokeDasharray="3 4"
              />
              <text
                x={PADDING.left - 6}
                y={yFor(t)}
                fontSize="10"
                textAnchor="end"
                dominantBaseline="middle"
                fill="currentColor"
                fillOpacity="0.7"
              >
                {fmtShort(t)}
              </text>
            </g>
          ))}

          {!isEmpty && (
            <g className="text-kofkan-crimson">
              <path d={areaPath} fill="url(#sk-rev-area)" />
              <polyline
                points={points}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {data.map((s, i) => (
                <circle
                  key={s.date}
                  cx={xFor(i)}
                  cy={yFor(s.revenue)}
                  r={hoverIdx === i ? 4 : 2.5}
                  fill="currentColor"
                />
              ))}
            </g>
          )}

          {isEmpty && (
            <>
              <line
                x1={PADDING.left}
                x2={WIDTH - PADDING.right}
                y1={yFor(0)}
                y2={yFor(0)}
                className="text-kofkan-crimson"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeOpacity="0.35"
                strokeDasharray="5 5"
              />
              <text
                x={(PADDING.left + WIDTH - PADDING.right) / 2}
                y={PADDING.top + innerH / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-kofkan-text-muted"
                fill="currentColor"
                fillOpacity="0.75"
                fontSize="13"
              >
                No revenue in this range yet
              </text>
            </>
          )}

          {data.length > 1 && (
            <g className="text-kofkan-text-muted">
              {Array.from(
                new Set([0, Math.floor((data.length - 1) / 2), data.length - 1])
              ).map((i) => (
                <text
                  key={`xlabel-${i}`}
                  x={xFor(i)}
                  y={HEIGHT - 8}
                  fontSize="10"
                  textAnchor="middle"
                  fill="currentColor"
                  fillOpacity="0.75"
                >
                  {fmtDateShort(data[i].date)}
                </text>
              ))}
            </g>
          )}

          {!isEmpty &&
            data.map((s, i) => (
              <rect
                key={`hit-${s.date}`}
                x={xFor(i) - innerW / data.length / 2}
                y={PADDING.top}
                width={Math.max(innerW / data.length, 6)}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
                onMouseMove={() => setHoverIdx(i)}
                onClick={() => setHoverIdx(i)}
              />
            ))}

          {hoverIdx != null && (
            <line
              x1={xFor(hoverIdx)}
              x2={xFor(hoverIdx)}
              y1={PADDING.top}
              y2={HEIGHT - PADDING.bottom}
              stroke="currentColor"
              strokeOpacity="0.2"
              strokeDasharray="2 3"
            />
          )}
        </svg>

        {hovered && (
          <div className="pointer-events-none absolute left-2 top-2 rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-medium text-kofkan-text-primary shadow ring-1 ring-black/[0.08]">
            <p className="text-kofkan-text-muted">{fmtDateShort(hovered.date)}</p>
            <p className="font-serif text-sm font-semibold text-kofkan-crimson">
              {formatGhs(hovered.revenue)}
            </p>
            <p className="text-[10px] text-kofkan-text-muted">
              {hovered.order_count} order{hovered.order_count === 1 ? "" : "s"}
            </p>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-kofkan-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-3 rounded-sm bg-kofkan-crimson" />
          Daily revenue
        </span>
        <span>
          {isEmpty
            ? `Window: last ${window} days (no paid orders)`
            : `Window: last ${data.length} day${data.length === 1 ? "" : "s"}`}
        </span>
      </div>
    </div>
  );
}
