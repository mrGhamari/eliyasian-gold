import { SHOP_ADDRESS, SHOP_DIRECTIONS, SHOP_PHONES } from "@/lib/site";

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5 shrink-0 text-gold-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="mt-0.5 size-5 shrink-0 text-gold-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

/** Shop contact section: tappable phone numbers, the store address and directions. */
export function ContactCard() {
  return (
    <section
      aria-labelledby="contact-title"
      className="rounded-2xl border border-gold-100 bg-white p-6 shadow-sm"
    >
      <h2 id="contact-title" className="mb-4 text-lg font-bold text-gold-700">
        تماس با فروشگاه
      </h2>

      <ul className="flex flex-col gap-1">
        {SHOP_PHONES.map((phone) => (
          <li key={phone.tel}>
            <a
              href={`tel:${phone.tel}`}
              className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-gold-50"
            >
              <PhoneIcon />
              <span dir="ltr" className="text-lg font-medium text-neutral-900">
                {phone.label}
              </span>
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-start gap-3 border-t border-gold-100 pt-4">
        <LocationIcon />
        <p className="text-sm leading-7 text-neutral-700">{SHOP_ADDRESS}</p>
      </div>

      <div className="mt-4">
        <h3 className="mb-2 text-sm font-medium text-neutral-700">مسیریابی با</h3>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SHOP_DIRECTIONS.map((app) => (
            <li key={app.id}>
              <a
                href={app.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`مسیریابی به فروشگاه با ${app.label}`}
                className="flex items-center justify-center rounded-xl border border-gold-100 px-3 py-2.5 text-sm font-medium text-gold-700 transition-colors hover:bg-gold-50"
              >
                {app.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
