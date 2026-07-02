"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders a formatted value and plays a subtle background flash whenever it
 * changes. Purely a background animation — no size/position change, so
 * polling updates cause zero layout shift.
 */
export function FlashValue({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  const previous = useRef(value);
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    if (previous.current !== value) {
      previous.current = value;
      setFlashKey((k) => k + 1);
    }
  }, [value]);

  return (
    <span
      key={flashKey}
      className={`tabular ${flashKey > 0 ? "price-flash" : ""} ${className}`}
    >
      {value}
    </span>
  );
}
