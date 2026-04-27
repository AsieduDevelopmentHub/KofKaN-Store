export function StarRating({
  value,
  className = "",
  showNumeric = false,
}: {
  value: number;
  className?: string;
  /** Mockup-style: five gold stars only. */
  showNumeric?: boolean;
}) {
  const rounded = Math.min(5, Math.max(0, Math.round(value)));

  return (
    <div
      className={`flex items-center gap-0.5 text-[13px] leading-none text-kofkan-gold ${className}`}
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={
            i <= rounded ? "text-kofkan-gold" : "text-kofkan-gray-soft dark:text-zinc-600"
          }
        >
          ★
        </span>
      ))}
      {showNumeric && (
        <span className="ml-1 text-[11px] text-kofkan-text-muted dark:text-zinc-500">
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
