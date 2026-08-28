# نقشه راه جامع معماری و پیاده‌سازی (Architectural Plan & Roadmap)
# Investment Portfolio App (React 18 + TypeScript + Vite + Tailwind CSS + Capacitor 7)

## ۱. مرور کلی معماری و اهداف سیستم (System Architecture Overview)
این سند نقشه راه فنی، مدل‌های داده‌ای، فرمول‌های محاسبات مالی و مراحل گام‌به‌گام پیاده‌سازی قابلیت‌های جدید اپلیکیشن مدیریت پورتفوی سرمایه‌گذاری را مشخص می‌کند.

هدف اصلی:
1. توسعه ماژول مدیریت املاک و مستغلات (Real Estate / Property Management) با ارزش‌گذاری دوگانه (ریال/تومان و دلار/تتر).
2. توسعه سیستم رهگیری سود/زیان دسته‌های خرید طلای فیزیکی (Physical Gold Lots P&L) و ثبت سوابق فروش در دفتر کل حسابرسی (Sales Audit History).
3. اجرای ۵ مرحله بهینه‌سازی و پولیش ارگونومی موبایل، هویت بصری دارک متالیک، دقت محاسبات مالی، پایداری آفلاین و کارایی رندرینگ.

---

## ۲. مدل‌های داده‌ای جدید و طرحواره‌ها (Data Schemas)

### ۲.۱. مدل املاک و مستغلات (`PropertyItem`)
```typescript
export type PropertyType = 'residential' | 'commercial' | 'land' | 'office' | 'other';

export interface PropertyItem {
  id: string;
  title: string;
  type: PropertyType;
  areaSquareMeters: number;
  purchaseDate: string; // ISO string یا تاریخ شمسی
  purchasePriceRial: number; // قیمت خرید به ریال
  currentValuationRial: number; // ارزش روز به ریال
  currentValuationUsd: number; // معادل دلاری محاسبه شده بر اساس نرخ تتر
  notes?: string;
  includeInTotalNetWorth: boolean; // آیا در محاسبه کل ثروت لحاظ شود؟
  createdAt: number;
  updatedAt: number;
}
```

### ۲.۲. دسته‌های خرید و تاریخچه فروش طلای فیزیکی (`Gold Lots & Audit Records`)
```typescript
export interface PhysicalGoldBuyLot {
  id: string;
  goldType: PhysicalGoldType; // 'gold_18k' | 'gold_24k' | 'coin_emami' | ...
  quantity: number; // گرم یا تعداد سکه
  purchaseUnitPriceTomans: number; // قیمت واحد خرید به تومان
  purchaseDate: string; // تاریخ خرید (ISO / شمسی)
  totalCostTomans: number; // جمع هزینه خرید = quantity * purchaseUnitPriceTomans
  notes?: string;
}

export interface PhysicalGoldSaleRecord {
  id: string;
  goldType: PhysicalGoldType;
  title: string;
  quantitySold: number;
  unitCostBasisTomans: number; // بهای تمام‌شده واحد (میانگین وزنی یا FIFO)
  saleUnitPriceTomans: number; // نرخ فروش هر واحد
  totalCostTomans: number; // کل بهای تمام‌شده بخش فروخته‌شده
  totalRevenueTomans: number; // کل دریافتی از فروش
  realizedProfitTomans: number; // سود/زیان محقق‌شده = دریافتی - بهای تمام‌شده
  realizedProfitPercent: number; // درصد سود محقق‌شده
  saleDate: string; // ISO string
  persianDate: string; // تاریخ شمسی
  notes?: string;
}
```

---

## ۳. فرمول‌ها و موتورهای محاسباتی (Financial Calculation Engines)

### ۳.۱. ارزش‌گذاری و سود/زیان املاک
$$ \text{Purchase Price (Toman)} = \frac{\text{purchasePriceRial}}{10} $$
$$ \text{Current Value (Toman)} = \frac{\text{currentValuationRial}}{10} $$
$$ \text{Capital Gain (Toman)} = \text{Current Value (Toman)} - \text{Purchase Price (Toman)} $$
$$ \text{Capital Gain (\%)} = \left( \frac{\text{Current Value} - \text{Purchase Price}}{\text{Purchase Price}} \right) \times 100 $$
$$ \text{Current Value (USD)} = \frac{\text{Current Value (Toman)}}{\text{Live USDT Rate}} $$

### ۳.۲. بهای تمام‌شده میانگین وزنی و سود/زیان تحقق‌نیافته طلای فیزیکی
برای هر قلم طلا یا سکه با دسته‌های خرید $\{(\text{qty}_i, \text{unitPrice}_i)\}$:
$$ \text{Total Quantity} = \sum_{i} \text{qty}_i $$
$$ \text{Total Cost (Tomans)} = \sum_{i} (\text{qty}_i \times \text{unitPrice}_i) $$
$$ \text{Weighted Average Cost Basis} = \frac{\text{Total Cost}}{\text{Total Quantity}} $$
$$ \text{Current Market Value} = \text{Total Quantity} \times \text{Live Market Rate} $$
$$ \text{Unrealized P\&L (Tomans)} = \text{Current Market Value} - \text{Total Cost} $$
$$ \text{Unrealized P\&L (\%)} = \left( \frac{\text{Current Market Value} - \text{Total Cost}}{\text{Total Cost}} \right) \times 100 $$

### ۳.۳. سود/زیان محقق‌شده در هنگام فروش یا کسر طلا
$$ \text{Revenue} = \text{quantitySold} \times \text{saleUnitPrice} $$
$$ \text{Cost Basis Sold} = \text{quantitySold} \times \text{Weighted Average Cost Basis} $$
$$ \text{Realized Profit (Tomans)} = \text{Revenue} - \text{Cost Basis Sold} $$
$$ \text{Realized Profit (\%)} = \left( \frac{\text{Realized Profit}}{\text{Cost Basis Sold}} \right) \times 100 $$

---

## ۴. ساختار ذخیره‌سازی محلی و سازگاری با گذشته (Storage & Migration)
کلیدهای ذخیره‌سازی در `localStorage`:
- `investment_app_properties_v1`: لیست املاک
- `investment_app_gold_buy_lots_v1`: دسته‌های خرید طلا
- `investment_app_physical_gold_sales_v1`: تاریخچه فروش طلا
- پشتیبانی کامل در `exportBackupData()` و `importBackupData()`.

---

## ۵. نقشه راه و مراحل اجرا (Milestones)
- **فاز ۰**: ایجاد مستندات مرجع `plan.md` و `rules.md` و ثبت کامیت.
- **لوپ ۱**: پیاده‌سازی ماژول مدیریت املاک و مستغلات با ارزش‌گذاری دوگانه ریال/دلار.
- **لوپ ۲**: پیاده‌سازی سیستم لات‌های خرید طلای فیزیکی، سود/زیان لحظه‌ای و سابقه فروش در SellView.
- **لوپ ۳**: هویت بصری لوکس دارک متالیک `#0B0F17`، افکت‌های نئون گلد `#E6B325` و تایپوگرافی فارسی.
- **لوپ ۴**: ارگونومی لمسی موبایل (اهداف لمسی ≥48px)، سازگاری Safe Area Insets، بازخورد لمسی (Haptic Feedback).
- **لوپ ۵**: کنترل حالات حدی محاسباتی (اعداد صفر، مقادیر فوق‌سنگین، تبدیل ارزها و بازتعادل).
- **لوپ ۶**: مهاجرت داده‌های قدیمی، عملکرد آفلاین کامل و امنیت پشتیبان‌گیری.
- **لوپ ۷**: بهینه‌سازی رندر و مموری، تست بیلد `npm run build` و سینک کپسیتور `npx cap sync`.
