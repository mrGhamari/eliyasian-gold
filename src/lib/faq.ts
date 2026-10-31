import {
  SHOP_ADDRESS,
  SHOP_HOURS_LABEL,
  SHOP_PHONES,
  SITE_NAME,
} from "./site";

/**
 * Frequently asked questions — one source for the visible FAQ section and the
 * FAQPage JSON-LD, which must match the page text word for word. Answers only
 * state facts the site already publishes (hours, address, phones, how prices
 * work); never add claims the shop hasn't confirmed (e.g. making charges).
 */
export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ: readonly FaqItem[] = [
  {
    question: "قیمت طلا در این صفحه هر چند وقت به‌روز می‌شود؟",
    answer:
      "قیمت‌ها بر اساس نرخ لحظه‌ای بازار به‌صورت خودکار و چند بار در ساعت به‌روزرسانی می‌شوند و زمان آخرین به‌روزرسانی کنار قیمت نمایش داده می‌شود.",
  },
  {
    question: "فرق قیمت فروش و قیمت خرید چیست؟",
    answer: `قیمت فروش مبلغی است که برای خرید هر گرم طلای ۱۸ عیار از ${SITE_NAME} می‌پردازید و قیمت خرید مبلغی است که فروشگاه برای هر گرم طلای ۱۸ عیار به شما پرداخت می‌کند.`,
  },
  {
    question: "آیا قیمت‌های این صفحه قطعی است؟",
    answer: `قیمت‌ها جهت اطلاع‌رسانی است و ملاک نهایی معامله، قیمت لحظه‌ای در فروشگاه ${SITE_NAME} است. پیش از مراجعه برای استعلام نهایی با فروشگاه تماس بگیرید.`,
  },
  {
    question: `آدرس ${SITE_NAME} کجاست؟`,
    answer: `تهران، ${SHOP_ADDRESS}.`,
  },
  {
    question: "ساعت کاری فروشگاه چیست؟",
    answer: `${SITE_NAME} ${SHOP_HOURS_LABEL} باز است.`,
  },
  {
    question: "شماره تماس فروشگاه چیست؟",
    answer: `با شماره‌های ${SHOP_PHONES.map((p) => p.label).join("، ")} تماس بگیرید.`,
  },
];
