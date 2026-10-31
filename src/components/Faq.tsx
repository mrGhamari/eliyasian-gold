import { FAQ } from "@/lib/faq";

/**
 * FAQ section. Answers sit in <details> so the list stays short on mobile;
 * they're in the server HTML either way, which is what search engines read.
 * The text is the same FAQ data the FAQPage JSON-LD is built from.
 */
export function Faq() {
  return (
    <section
      aria-labelledby="faq-title"
      className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
    >
      <h2 id="faq-title" className="mb-3 text-lg font-bold text-neutral-800">
        سؤالات متداول
      </h2>
      <div className="divide-y divide-neutral-100">
        {FAQ.map((item) => (
          <details key={item.question} className="group py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-neutral-800 [&::-webkit-details-marker]:hidden">
              <h3>{item.question}</h3>
              <span
                aria-hidden="true"
                className="shrink-0 text-gold-600 transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-2 text-sm leading-7 text-neutral-700">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
