(() => {
  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  const isIOS = () =>
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = () =>
    /safari/i.test(navigator.userAgent) &&
    !/crios|fxios|edgios|opios/i.test(navigator.userAgent);

  function addApplePwaMetadata() {
    const addMeta = (name, content) => {
      let tag = document.querySelector('meta[name="' + name + '"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.name = name;
        document.head.appendChild(tag);
      }
      tag.content = content;
    };
    addMeta('apple-mobile-web-app-capable', 'yes');
    addMeta('apple-mobile-web-app-status-bar-style', 'default');
    addMeta('apple-mobile-web-app-title', 'بوابة التمريض');
    if (!document.querySelector('link[rel="apple-touch-icon"]')) {
      const icon = document.createElement('link');
      icon.rel = 'apple-touch-icon';
      icon.href = '/assets/images/logo.png';
      document.head.appendChild(icon);
    }
  }

  let installPrompt = null;
  let installButton = null;
  let overlay = null;
  let prepared = false;
  let installAccepted = false;

  const assetsToPrepare = [
    '/', '/manifest.webmanifest', '/assets/images/logo.png',
    '/assets/images/favicon.png', '/js/pwa.js', '/sw.js'
  ];

  function registerWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }, { once: true });
  }

  function makeOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'bawabetInstallOverlay';
    overlay.dir = 'rtl';
    overlay.innerHTML = `
      <style>
        #bawabetInstallOverlay{position:fixed;inset:0;z-index:1000000;background:linear-gradient(145deg,#eef6ff,#f8fbff 55%,#e8f4f7);display:grid;place-items:center;padding:18px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#173b56;overflow:auto}
        #bawabetInstallOverlay *{box-sizing:border-box}
        #bawabetInstallOverlay .bi-card{width:min(100%,430px);background:#fff;border:1px solid #e1edf5;border-radius:26px;padding:25px 21px;text-align:center;box-shadow:0 18px 55px rgba(18,59,90,.13)}
        #bawabetInstallOverlay .bi-logo{width:78px;height:78px;object-fit:contain;border-radius:20px;margin:0 auto 10px}
        #bawabetInstallOverlay .bi-eyebrow{font-size:11px;color:#43869c;font-weight:800;letter-spacing:.4px}
        #bawabetInstallOverlay h2{font-size:23px;margin:9px 0;color:#123b5a}
        #bawabetInstallOverlay p{color:#637b8d;line-height:1.85;font-size:14px;margin:9px 0 18px}
        #bawabetInstallOverlay .bi-percent{font-size:27px;font-weight:850;color:#123b5a;font-variant-numeric:tabular-nums}
        #bawabetInstallOverlay .bi-track{height:12px;background:#e9f0f5;border-radius:99px;overflow:hidden;margin:16px 0 9px}
        #bawabetInstallOverlay .bi-fill{height:100%;width:0;background:linear-gradient(90deg,#19a6a0,#2878b7);border-radius:99px;transition:width .2s}
        #bawabetInstallOverlay .bi-status{font-size:13px;color:#668092;min-height:24px;line-height:1.7}
        #bawabetInstallOverlay .bi-action{width:100%;border:0;border-radius:15px;padding:15px;background:#123b5a;color:#fff;font-size:16px;font-weight:800;margin-top:15px;cursor:pointer}
        #bawabetInstallOverlay .bi-secondary{background:#eaf3f8;color:#123b5a}
        #bawabetInstallOverlay .bi-hidden{display:none!important}
        #bawabetInstallOverlay .bi-steps{text-align:right;background:#f3f8fb;border-radius:15px;padding:13px 17px;margin:15px 0;color:#456579;font-size:13px;line-height:2}
        #bawabetInstallOverlay .bi-steps b{color:#123b5a}
        #bawabetInstallOverlay .bi-check{font-size:46px;color:#159b87;margin:8px 0}
      </style>
      <main class="bi-card">
        <img class="bi-logo" src="/assets/images/logo.png" alt="شعار بوابة التمريض">
        <div class="bi-eyebrow">BAWABET AL TAMREED</div>
        <h2 id="biTitle">تثبيت بوابة التمريض</h2>
        <p id="biIntro">هنجهّز ملفات المنصة أولًا، وبعدها نوضح لك خطوة التثبيت من Google Chrome.</p>
        <div id="biProgressArea">
          <div class="bi-percent" id="biPercent">0%</div>
          <div class="bi-track"><div class="bi-fill" id="biFill"></div></div>
          <div class="bi-status" id="biStatus">جاري تجهيز ملفات المنصة...</div>
        </div>
        <div id="biManualArea" class="bi-hidden">
          <p id="biManualIntro">اتبع خطوات التثبيت المناسبة لمتصفحك:</p>
          <div class="bi-steps" id="biManualSteps"></div>
          <p id="biManualNote">بعد الإضافة، ابحث عن أيقونة بوابة التمريض على جهازك.</p>
        </div>
        <div id="biSuccessArea" class="bi-hidden">
          <div class="bi-check">✓</div>
          <h2>تم تثبيت التطبيق</h2>
          <p>أصبحت بوابة التمريض مثبتة على جهازك. افتح أيقونة «بوابة التمريض» من الشاشة الرئيسية أو قائمة التطبيقات.</p>
        </div>
        <div id="biPendingArea" class="bi-hidden">
          <p>وافقت على طلب التثبيت. ننتظر تأكيد Chrome لإتمام التثبيت؛ لن نعرض رسالة النجاح قبل وصول التأكيد.</p>
        </div>
        <button id="biInstall" class="bi-action bi-hidden" type="button">تثبيت التطبيق الآن</button>
        <button id="biManual" class="bi-action bi-secondary bi-hidden" type="button">عرض خطوات التثبيت من Chrome</button>
        <button id="biClose" class="bi-action bi-secondary" type="button">العودة للمنصة</button>
      </main>`;
    document.body.appendChild(overlay);

    const el = id => overlay.querySelector('#' + id);
    el('biClose').addEventListener('click', closeOverlay);
    el('biManual').addEventListener('click', () => {
      el('biManualArea').classList.toggle('bi-hidden');
    });
    setPlatformInstructions(overlay);
    el('biInstall').addEventListener('click', async () => {
      if (!installPrompt) {
        el('biManualArea').classList.remove('bi-hidden');
        el('biStatus').textContent = 'استخدم خطوات Chrome الموضحة بالأسفل لإتمام التثبيت.';
        return;
      }
      const promptEvent = installPrompt;
      installPrompt = null;
      el('biInstall').disabled = true;
      try {
        promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === 'accepted') {
          installAccepted = true;
          el('biInstall').classList.add('bi-hidden');
          el('biProgressArea').classList.add('bi-hidden');
          el('biPendingArea').classList.remove('bi-hidden');
          el('biTitle').textContent = 'جارٍ تأكيد التثبيت';
          el('biIntro').textContent = 'تم قبول طلب التثبيت من Chrome.';
        } else {
          el('biInstall').disabled = false;
          el('biStatus').textContent = 'لم يتم التثبيت. يمكنك المحاولة مرة أخرى أو اتباع خطوات Chrome.';
          el('biManualArea').classList.remove('bi-hidden');
        }
      } catch (_) {
        el('biInstall').disabled = false;
        el('biStatus').textContent = 'تعذر فتح نافذة التثبيت. استخدم خطوات Chrome الموضحة بالأسفل.';
        el('biManualArea').classList.remove('bi-hidden');
      }
    });
    return overlay;
  }

  function closeOverlay() {
    if (overlay) overlay.remove();
    overlay = null;
  }

  async function prepareInCurrentPage() {
    const root = makeOverlay();
    const el = id => root.querySelector('#' + id);

    if (isStandalone()) {
      showInstalledState();
      return;
    }
    if (prepared) {
      revealNextStep();
      return;
    }

    let completed = 0;
    const total = assetsToPrepare.length;
    const cacheName = 'bawabet-static-v4';
    const update = () => {
      const value = Math.round(completed / total * 100);
      el('biPercent').textContent = value + '%';
      el('biFill').style.width = value + '%';
      el('biStatus').textContent = 'تم تجهيز ' + completed + ' من ' + total + ' ملفات المنصة';
    };

    try {
      const cache = await caches.open(cacheName);
      for (const path of assetsToPrepare) {
        try {
          const response = await fetch(path, { cache: 'reload' });
          if (response.ok) await cache.put(path, response.clone());
        } catch (_) {
          // An optional asset failure does not mean that the PWA was installed.
        }
        completed++;
        update();
      }
      prepared = true;
      el('biTitle').textContent = 'ملفات المنصة جاهزة';
      el('biIntro').textContent = 'اكتمل تجهيز الملفات. الخطوة التالية هي تثبيت التطبيق من Chrome.';
      el('biStatus').textContent = 'اكتمل تجهيز الملفات — لم يتم تثبيت التطبيق بعد.';
      revealNextStep();
    } catch (_) {
      prepared = true;
      el('biTitle').textContent = 'جاهز لخطوة التثبيت';
      el('biIntro').textContent = 'تعذر تخزين بعض الملفات، لكن يمكنك متابعة تعليمات التثبيت من Chrome.';
      el('biStatus').textContent = 'التجهيز الجزئي اكتمل — لم يتم تثبيت التطبيق بعد.';
      revealNextStep();
    }
  }

  function setPlatformInstructions(root) {
    const ios = isIOS();
    const intro = root.querySelector('#biManualIntro');
    const steps = root.querySelector('#biManualSteps');
    const note = root.querySelector('#biManualNote');
    if (ios) {
      intro.textContent = isSafari()
        ? 'لتثبيت بوابة التمريض على الآيفون، اتبع الخطوات التالية من Safari:'
        : 'لتثبيت بوابة التمريض على الآيفون، افتح هذا الموقع أولًا في متصفح Safari:';
      steps.innerHTML = isSafari()
        ? '<b>1.</b> اضغط زر المشاركة في Safari (مربع وسهم لأعلى).<br><b>2.</b> مرّر القائمة واختر <b>«إضافة إلى الشاشة الرئيسية»</b>.<br><b>3.</b> اضغط <b>«إضافة»</b> أعلى الشاشة.'
        : '<b>1.</b> افتح الرابط في Safari.<br><b>2.</b> اضغط زر المشاركة.<br><b>3.</b> اختر «إضافة إلى الشاشة الرئيسية» ثم «إضافة».';
      note.textContent = 'بعد الإضافة ستظهر أيقونة بوابة التمريض على شاشة الآيفون الرئيسية. افتحها منها لاستخدام التطبيق.';
      root.querySelector('#biManual').textContent = 'عرض خطوات التثبيت على iPhone';
    } else {
      intro.textContent = 'لتثبيت بوابة التمريض على Android من Google Chrome:';
      steps.innerHTML = '<b>1.</b> افتح قائمة Chrome (⋮).<br><b>2.</b> اختر <b>«تثبيت التطبيق»</b> أو <b>«إضافة إلى الشاشة الرئيسية»</b>.<br><b>3.</b> اضغط <b>«تثبيت»</b> أو <b>«إضافة»</b> للتأكيد.';
      note.textContent = 'بعد التثبيت، ابحث عن أيقونة بوابة التمريض في الشاشة الرئيسية أو قائمة التطبيقات.';
      root.querySelector('#biManual').textContent = 'عرض خطوات التثبيت على Android';
    }
  }

  function revealNextStep() {
    if (!overlay || isStandalone()) return;
    setPlatformInstructions(overlay);
    const el = id => overlay.querySelector('#' + id);
    if (installPrompt) {
      el('biInstall').classList.remove('bi-hidden');
      el('biManual').classList.add('bi-hidden');
      el('biManualArea').classList.add('bi-hidden');
    } else {
      el('biInstall').classList.add('bi-hidden');
      el('biManual').classList.remove('bi-hidden');
      el('biManualArea').classList.remove('bi-hidden');
      el('biStatus').textContent = 'لم يتم التثبيت بعد. اتبع خطوات Google Chrome الموضحة.';
    }
  }

  function showInstalledState() {
    if (!overlay) makeOverlay();
    const el = id => overlay.querySelector('#' + id);
    el('biTitle').textContent = 'تم فتح التطبيق المثبّت';
    el('biIntro').textContent = 'أنت الآن تستخدم بوابة التمريض كتطبيق مستقل على جهازك.';
    el('biProgressArea').classList.add('bi-hidden');
    el('biManualArea').classList.add('bi-hidden');
    el('biPendingArea').classList.add('bi-hidden');
    el('biInstall').classList.add('bi-hidden');
    el('biManual').classList.add('bi-hidden');
    el('biSuccessArea').classList.remove('bi-hidden');
  }

  function addInstallButton() {
    if (isStandalone() || document.getElementById('bawabetInstallApp')) return;
    const btn = document.createElement('button');
    btn.id = 'bawabetInstallApp';
    btn.type = 'button';
    btn.textContent = '⬇ تثبيت التطبيق';
    btn.setAttribute('aria-label', 'تثبيت تطبيق بوابة التمريض على الهاتف');
    Object.assign(btn.style, {
      position: 'fixed', bottom: '18px', left: '16px', zIndex: '99999',
      border: 0, borderRadius: '999px', padding: '13px 19px',
      background: '#123b5a', color: '#fff', font: '700 14px system-ui',
      boxShadow: '0 6px 22px rgba(0,0,0,.22)', cursor: 'pointer'
    });
    btn.addEventListener('click', prepareInCurrentPage);
    document.body.appendChild(btn);
    installButton = btn;
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    if (overlay && prepared) revealNextStep();
  });

  window.addEventListener('appinstalled', () => {
    installAccepted = true;
    if (installButton) installButton.remove();
    if (!overlay) return;
    const el = id => overlay.querySelector('#' + id);
    el('biProgressArea').classList.add('bi-hidden');
    el('biInstall').classList.add('bi-hidden');
    el('biPendingArea').classList.remove('bi-hidden');
    el('biManualArea').classList.remove('bi-hidden');
    el('biTitle').textContent = 'طلب التثبيت اكتمل في Chrome';
    el('biIntro').textContent = 'Chrome أرسل تأكيدًا لطلب التثبيت، لكن الصفحة لا تستطيع التأكد من مكان ظهور الأيقونة أو تشغيلها نيابةً عن أندرويد.';
    el('biPendingArea').innerHTML = '<p>ارجع إلى الشاشة الرئيسية أو قائمة التطبيقات وابحث عن «بوابة التمريض». افتح الأيقونة من هناك لتشغيل نسخة التطبيق. إذا لم تجدها، افتح قائمة Chrome ⋮ وتحقق من خيار «تثبيت التطبيق» مرة أخرى.</p>';
    el('biManualArea').classList.add('bi-hidden');
  });

  addApplePwaMetadata();
  registerWorker();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addInstallButton, { once: true });
  } else {
    addInstallButton();
  }
})();