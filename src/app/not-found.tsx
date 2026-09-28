import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold text-neutral-900">صفحه پیدا نشد</h1>
      <p className="text-neutral-600">صفحه‌ای که دنبالش بودید وجود ندارد.</p>
      <Link
        href="/"
        className="rounded-xl bg-gold-500 px-5 py-2.5 font-medium text-white transition-colors hover:bg-gold-600"
      >
        مشاهده قیمت طلا امروز
      </Link>
    </main>
  );
}
