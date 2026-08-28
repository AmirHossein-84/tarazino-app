---
trigger: always_on
---

# دستورالعمل‌های توسعه و انتشار اپلیکیشن مدیریت سرمایه (Investment Portfolio App Guidelines)

## ۱. انتشار و بیلد اندروید (Android Release & CI)
- برای ساخت APK نسخه نهایی جهت انتشار در کافه‌بازار، مایکت یا گوگل‌پلی، همیشه از دستور `./gradlew assembleRelease` استفاده شود تا پکیج با کلید اختصاصی `android/release-key.jks` و امضای معتبر V1/V2 بیلد شود.
- دستور `./gradlew assembleDebug` فقط برای تست‌های سریع توسعه محلی است و توسط استورها به دلیل خطای «امضا با کلید دیباگ» رد می‌شود.

## ۲. خط لوله آیکون‌ها و برندینگ (Capacitor Branding Pipeline)
- هنگام به‌روزرسانی لوگو و هویت بصری اپلیکیشن، باید تمامی مسیرهای زیر به صورت همزمان تولید و به‌روز شوند:
  1. **آیکون‌های لانچر اندروید (`android/app/src/main/res/mipmap-*`):** سایزهای ۴۸, ۷۲, ۹۶, ۱۴۴, ۱۹۲ برای `ic_launcher.png`, `ic_launcher_round.png` و `ic_launcher_foreground.png`.
  2. **آیکون iOS (`ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`):** سایز یونیورسال ۱۰۲۴×۱۰۲۴.
  3. **اسپلش اسکرین‌ها (`drawable-port-*`, `drawable-land-*`, `Splash.imageset`):** پس‌زمینه دارک متالیک `#0B0F17` با لوگوی وسط‌چین.
  4. **آیکون‌های وب و PWA (`public/`):** `icon-1024.png`, `icon-512.png`, `icon-192.png`, `apple-touch-icon.png`, `favicon.png`, `icon.svg`.
  5. اجرای `npx cap sync` پس از هر تغییر دارایی بصری جهت انتقال به کدهای نیتیو.

## ۳. اتصال امن و همگام‌سازی صرافی نوبیتکس (Nobitex Service Integration)
- در فرم‌های ورود API Key نوبیتکس، تنظیمات جدید باید به صورت مستقیم (`overrideConfig`) به متد `syncWithNobitex` پاس داده شوند تا از تاخیرهای ناهمگام `useState` در اولین سینک جلوگیری شود.
- پس از هر ذخیره‌سازی، رویداد `nobitex_config_updated` به صورت سراسری منتشر شود تا تمام کامپوننت‌های فعال هماهنگ گردند.

## ۴. استانداردهای استور و بنرهای مارکتینگ (Store Assets Optimization)
- تصاویر پروموشنال و بنرهای ارسالی به کافه‌بازار باید کمتر از ۱ مگابایت باشند.
- برای کاهش حجم بنرهای ۱۰۸۰×۲۲۸۰ از روش فشرده‌سازی بی‌اتلاف ImageMagick با دستور زیر استفاده شود:
  `magick input.png -strip -define png:compression-level=9 output.png`
