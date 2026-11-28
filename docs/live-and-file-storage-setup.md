# تشغيل البث المباشر والتخزين داخل بوابة التمريض

هذا التكامل يستبدل روابط Meet/Zoom بقاعة داخل المنصة، ويستخدم Cloudflare RealtimeKit للبث وCloudflare R2 للملفات. الكود لا يصبح حيًا بمجرد وجوده في GitHub؛ يلزم إعداد موارد Cloudflare ونشر Worker.

## 1) إنشاء RealtimeKit App

1. افتح Cloudflare Dashboard ثم Realtime > RealtimeKit وأنشئ App باسم Bawabet Altamreed.
2. احتفظ بـ App ID وAccount ID.
3. أنشئ API Token بصلاحية Realtime Admin. لا تضعه في ملفات GitHub أو JavaScript المتصفح.
4. تأكد من وجود Presets الافتراضية: webinar_presenter وwebinar_viewer. المدرس يدخل مقدمًا، والطلاب يدخلون كمشاهدين مع طلب الصعود إلى المنصة.
5. راجع الحصة والتكلفة من لوحة RealtimeKit قبل إطلاق المحاضرات للطلاب.

## 2) إنشاء R2 bucket وربطه بالـWorker

1. افتح R2 Object Storage وأنشئ bucket باسم bawabet-academy-files.
2. أنشئ Worker منفصلًا باسم bawabet-live-storage-api.
3. اجعل ملف الدخول هو cloudflare/live-storage-api.js.
4. أضف R2 binding باسم FILES يشير إلى bucket bawabet-academy-files.
5. أضف متغيرات البيئة:
   - FIREBASE_PROJECT_ID=bawabet-altamreed
   - FIREBASE_API_KEY = Web API Key من إعدادات Firebase للمشروع.
   - CF_ACCOUNT_ID = Cloudflare Account ID.
   - REALTIMEKIT_APP_ID = App ID من RealtimeKit.
6. أضف الأسرار من إعدادات Worker > Settings > Variables and Secrets:
   - REALTIMEKIT_API_TOKEN = API Token بصلاحية Realtime Admin.
   - DOWNLOAD_SIGNING_SECRET = قيمة عشوائية طويلة لا تقل عن 32 بايت.
7. اربط Route: api.bawabet-altamreed.com/* . أنشئ DNS record فرعيًا باسم api واجعله Proxied إذا طلبت لوحة Cloudflare ذلك.
8. انشر Worker. لا ترسل API Token أو Download Secret في المحادثة.

يمكن استخدام cloudflare/wrangler-live.toml كمرجع لإعدادات النشر والـR2 binding.

## 3) صلاحيات المحاضرات

- Worker يتحقق من Firebase ID token على الخادم.
- المدرس يحتاج اشتراكًا نشطًا ويأخذ preset webinar_presenter.
- الطالب يحتاج عضوية نشطة في صف المحاضرة ويأخذ preset webinar_viewer.
- يسمح بالانضمام قبل الموعد بـ15 دقيقة، وحتى 30 دقيقة بعد نهاية المدة المسجلة.
- جلسة RealtimeKit لا تنشئ جدولًا زمنيًا بنفسها؛ Firestore يحتفظ بالموعد والمدة وMeeting ID.

## 4) تخزين الملفات

- Firestore يخزن بيانات الملف فقط: الاسم والنوع والحجم ومفتاح R2.
- R2 يخزن البايتات الفعلية.
- الرفع Multipart على أجزاء 8 MiB من المتصفح، والحد الأعلى في هذا التكامل 50 GiB لكل ملف في واجهة الرفع الحالية؛ R2 نفسه يدعم أحجامًا أكبر لكن واجهة المنصة تضع حدًا عمليًا.
- تنزيل الملف يمر بتذكرة موقعة قصيرة الصلاحية مع دعم HTTP Range للفيديو.
- لا تجعل bucket عامًا؛ الوصول يتم عبر Worker بعد التحقق من صلاحية قراءة مستند المحتوى.

## 5) ما الذي لم يكتمل قبل النشر؟

- إعداد RealtimeKit App وAPI Token وPresets داخل حساب Cloudflare.
- إنشاء R2 bucket وربط binding والأسرار وRoute.
- نشر Worker ثم اختبار دخول مدرس وطالب بحسابين حقيقيين، واختبار شاشة ومشاركة الشاشة وطلب الصعود والإنهاء.
- اختبار رفع وتنزيل PDF وصورة وفيديو كبير، واختبار صلاحيات طالب من أكاديمية أخرى.
- نشر أي تعديلات لازمة على Firestore Rules من Firebase Console بعد مراجعتها.

لا تعتبر المحاضرات أو تخزين الملفات جاهزة للإنتاج قبل اجتياز هذه الاختبارات.
