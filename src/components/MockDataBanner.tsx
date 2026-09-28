/** Shown whenever the mock provider is active, so test data is never mistaken for real prices. */
export function MockDataBanner() {
  return (
    <div
      className="rounded-xl border border-red-300 bg-red-50 p-4 text-center"
      role="alert"
    >
      <p className="font-medium text-red-800">
        داده‌های آزمایشی — این قیمت‌ها واقعی نیستند.
      </p>
    </div>
  );
}
