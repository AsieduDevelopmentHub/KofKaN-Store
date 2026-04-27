/** Order row `status` from API (see `Order` model). */
export function orderStatusLabel(status: string): string {
  const s = status.trim().toLowerCase();
  if (!s) return "Unknown";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function orderStatusPillClass(status: string): string {
  const s = status.trim().toLowerCase();
  switch (s) {
    case "delivered":
      return "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-800/40";
    case "shipped":
      return "bg-blue-100 text-blue-800 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-800/40";
    case "processing":
      return "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-800/40";
    case "cancelled":
      return "bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:ring-rose-800/40";
    case "pending":
    default:
      return "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-white/10";
  }
}
