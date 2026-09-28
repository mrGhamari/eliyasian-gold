"use client";

import { formatTehranTime } from "@/lib/time";

export function FreshnessBadge({
  fetchedAt,
  stale,
}: {
  fetchedAt: string;
  stale: boolean;
}) {
  if (stale) {
    return (
      <p
        className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-900"
        role="status"
      >
        <span aria-hidden className="h-2 w-2 rounded-full bg-amber-500" />
        قیمت‌ها ممکن است به‌روز نباشند — آخرین به‌روزرسانی:{" "}
        <time dateTime={fetchedAt} className="tabular">
          {formatTehranTime(fetchedAt)}
        </time>
      </p>
    );
  }

  // No live region here: it would re-announce the time on every poll.
  return (
    <p
      className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-600"
    >
      <span aria-hidden className="live-dot h-2 w-2 rounded-full bg-emerald-500" />
      آخرین به‌روزرسانی:{" "}
      <time dateTime={fetchedAt} className="tabular">
        {formatTehranTime(fetchedAt)}
      </time>
    </p>
  );
}
