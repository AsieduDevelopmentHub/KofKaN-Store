"use client";

/**
 * AliExpress-style vertical status timeline rendered on order detail.
 * Statuses map backend values to a 5-step lifecycle:
 *   pending → confirmed/processing → packed/shipped → out_for_delivery → delivered.
 * Cancelled orders render a crossed-out stack ending at the cancel step.
 */

type Props = {
  status: string;
  createdAt: string;
  updatedAt: string;
  isCancelled?: boolean;
};

type Step = {
  key: string;
  label: string;
  description: string;
};

const STEPS: Step[] = [
  { key: "placed", label: "Order placed", description: "We received your order." },
  { key: "confirmed", label: "Payment confirmed", description: "Payment has cleared." },
  { key: "packed", label: "Packed", description: "Your items are packed and ready." },
  { key: "shipped", label: "Shipped", description: "Handed to the courier." },
  { key: "delivered", label: "Delivered", description: "Order received." },
];

const STATUS_TO_STEP: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  processing: 1,
  packed: 2,
  ready: 2,
  shipped: 3,
  dispatched: 3,
  out_for_delivery: 3,
  delivered: 4,
};

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function OrderStatusTimeline({ status, createdAt, updatedAt, isCancelled }: Props) {
  const statusKey = status.trim().toLowerCase();
  const cancelled = isCancelled ?? statusKey === "cancelled";
  const activeIdx = cancelled ? -1 : STATUS_TO_STEP[statusKey] ?? 0;

  return (
    <section className="rounded-[12px] bg-white p-4 shadow-sm ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/10">
      <h2 className="font-serif text-section-title font-semibold text-kofkan-text-primary dark:text-zinc-100">
        Order progress
      </h2>
      {cancelled ? (
        <div className="mt-3 rounded-[10px] bg-red-50 px-3 py-2 text-small text-red-900 dark:bg-red-950/40 dark:text-red-100">
          This order was cancelled on {formatWhen(updatedAt)}.
        </div>
      ) : (
        <ol className="mt-4 space-y-4">
          {STEPS.map((s, i) => {
            const done = i < activeIdx;
            const active = i === activeIdx;
            return (
              <li key={s.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                      done
                        ? "bg-kofkan-gold text-white"
                        : active
                          ? "bg-kofkan-crimson text-white ring-4 ring-kofkan-crimson/15"
                          : "bg-kofkan-gray-soft text-kofkan-text-muted dark:bg-zinc-800 dark:text-zinc-500"
                    }`}
                    aria-hidden
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  {i < STEPS.length - 1 ? (
                    <span
                      className={`mt-1 w-px flex-1 ${done ? "bg-kofkan-gold" : "bg-kofkan-gray-soft dark:bg-zinc-800"}`}
                    />
                  ) : null}
                </div>
                <div className="pb-1">
                  <p
                    className={`text-small font-semibold ${
                      active
                        ? "text-kofkan-text-primary dark:text-zinc-100"
                        : done
                          ? "text-kofkan-text-primary dark:text-zinc-100"
                          : "text-kofkan-text-muted dark:text-zinc-500"
                    }`}
                  >
                    {s.label}
                  </p>
                  <p className="text-[11px] leading-relaxed text-kofkan-text-muted dark:text-zinc-500">
                    {s.description}
                  </p>
                  {i === 0 ? (
                    <p className="mt-1 text-[11px] text-kofkan-text-muted dark:text-zinc-500">
                      {formatWhen(createdAt)}
                    </p>
                  ) : null}
                  {active && i !== 0 ? (
                    <p className="mt-1 text-[11px] text-kofkan-text-muted dark:text-zinc-500">
                      Updated {formatWhen(updatedAt)}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
