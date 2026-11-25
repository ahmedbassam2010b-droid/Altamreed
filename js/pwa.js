(() => {
  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  let installPrompt = null;
  let installButton = null;
  let overlay = null;
  let prepared = false;

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
        #bawabetInstallOverlay{position:fixed;inset:0;z-index:1000000;background:linear-gradient(145deg,#eef6ff,#f8fbff 55%,#e8f4f7);display:grid;place-items:center;padding:20px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#173b56}
        #bawabetInstallOverlay *{box-sizing:border-box}
        #bawabetInstallOverlay .bi-card{width:min(100%,430px);background:#fff;border:1px solid #e1edf5;border-radius:26px;padding:28px 22px;text-align:center;box-shadow:0 18px 55px rgba(18,59,90,.13)}
        #bawabetInstallOverlay .bi-logo{width:84px;height:84px;object-fit:contain;border-radius:20px;margin:0 auto 12px}
        #bawabetInstallOverlay .bi-eyebrow{font-size:12px;color:#43869c;font-weight:800}
        #bawabetInstallOverlay h2{font-size:24px;margin:9px 0;color:#123b5a}
        #bawabetInstallOverlay p{color:#637b8d;line-height:1.8;font-size:14px;margin:8px 0 20px}
        #bawabetInstallOverlay .bi-percent{font-size:28px;font-weight:850;color:#123b5a;font-variant-numeric:tabular-nums}
        #bawabetInstallOverlay .bi-track{height:13px;background:#e9f0f5;border-radius:99px;overflow:hidden;margin:18px 0 9px}
        #bawabetInstallOverlay .bi-fill{height:100%;width:0;background:linear-gradient(90deg,#19a6a0,#2878b7);border-radius:99px;transition:width .2s}
        #bawabetInstallOverlay .bi-status{font-size:13px;color:#668092;min-height:24px}
        #bawabetInstallOverlay .bi-action{width:100%;border:0;border-radius:15px;padding:15px;background:#123b5a;color:#fff;font-size:16px;font-weight:800;margin-top:18px;cursor:pointer}
        #bawabetInstallOverlay .bi-secondary{background:#eaf3f8;color:#123b5a}
        #bawabetInstallOverlay .bi-hidden{display:none!important}
      </style>
      <main class="bi-card">
        <img class="bi-logo" src="/assets/images/logo.png" alt="شعار بوابة التمريض">
        <div class="bi-eyebrow">BAWABET AL TAMREED</div>
        <h2 id="biTitle">تجهيز تطبيق بوابة التمريض</h2>
        <p id="biIntro">بنجهّز الملفات الأساسية للتطبيق. خليك في الصفحة لحد ما التجهيز يكتمل.</p>
        <div id="biProgressArea">
          <div class="bi-percent" id="biPercent">0%</div>
          <div class="bi-track"><div class="bi-fill" id="biFill"></div></div>
          <div class="bi-status" id="biStatus">جاري تجهيز التطبيق...</div>
        </div>
        <button id="biInstall" class="bi-action bi-hidden" type="button">تثبيت التطبيق الآن</button>
        <button id="biOpen" class="bi-action bi-hidden" type="button">فتح التطبيق</button>
        <button id="biManual" class="bi-action bi-secondary bi-hidden" type="button">طريقة التثبيت من Chrome</button>
        <button id="biClose" class="bi-action bi-secondary" type="button">رجوع للمنصة</button>
      </main>`;
    document.body.appendChild(overlay);

    const el = id => overlay.querySelector('#' + id);
    el('biClose').addEventListener('click', closeOverlay);
    el('biOpen').addEventListener('click', () => { window.location.href = '/'; });
    el('biManual').addEventListener('click', () => {
      el('biStatus').textContent = 'افتح قائمة Chrome ⋮ ثم اختر «تثبيت التطبيق». لو ظهر «إضافة إلى الشاشة الرئيسية» اختاره.';
    });
    el('biInstall').addEventListener('click', async () => {
      if (!installPrompt) {
        el('biStatus').textContent = 'لم يرسل Chrome طلب التثبيت التلقائي لهذه الصفحة. استخدم قائمة Chrome ⋮ ثم «تثبيت التطبيق».';
        el('biManual').classList.remove('bi-hidden');
        return;
      }
      const promptEvent = installPrompt;
      installPrompt = null;
      el('biInstall').disabled = true;
      try {
        promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === 'accepted') {
          el('biTitle').textContent = 'تم قبول طلب التثبيت';
          el('biIntro').textContent = 'انتظر تأكيد المتصفح، وبعدها اضغط فتح التطبيق.';
          el('biStatus').textContent = 'جاري إنهاء التثبيت...';
          el('biOpen').classList.remove('bi-hidden');
        } else {
          el('biStatus').textContent = 'لم يتم التثبيت. يمكنك المحاولة من قائمة Chrome.';
          el('biInstall').disabled = false;
          el('biManual').classList.remove('bi-hidden');
        }
      } catch (_) {
        el('biStatus').textContent = 'تعذر فتح نافذة التثبيت. استخدم قائمة Chrome ⋮.';
        el('biManual').classList.remove('bi-hidden');
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
      el('biTitle').textContent = 'التطبيق مثبت بالفعل';
      el('biIntro').textContent = 'بوابة التمريض جاهزة على جهازك.';
      el('biProgressArea').classList.add('bi-hidden');
      el('biOpen').classList.remove('bi-hidden');
      return;
    }
    if (prepared) {
      revealInstallAction();
      return;
    }

    let completed = 0;
    const total = assetsToPrepare.length;
    const cacheName = 'bawabet-static-v3';
    const update = () => {
      const value = Math.round(completed / total * 100);
      el('biPercent').textContent = value + '%';
      el('biFill').style.width = value + '%';
      el('biStatus').textContent = 'تم فحص وتجهيز ' + completed + ' من ' + total + ' ملفات';
    };

    try {
      const cache = await caches.open(cacheName);
      for (const path of assetsToPrepare) {
        try {
          const response = await fetch(path, { cache: 'reload' });
          if (response.ok) await cache.put(path, response.clone());
        } catch (_) {
          // A missing optional asset must not block the native browser install.
        }
        completed++;
        update();
      }
      prepared = true;
      el('biTitle').textContent = 'التجهيز اكتمل';
      el('biIntro').textContent = 'ملفات المنصة الأساسية جاهزة. اضغط على الزر لفتح نافذة التثبيت الرسمية.';
      el('biStatus').textContent = 'اكتمل تجهيز الملفات';
      revealInstallAction();
    } catch (_) {
      el('biStatus').textContent = 'تعذر تخزين بعض الملفات، لكن يمكنك متابعة التثبيت من Chrome.';
      revealInstallAction();
    }
  }

  function revealInstallAction() {
    if (!overlay) return;
    const install = overlay.querySelector('#biInstall');
    const manual = overlay.querySelector('#biManual');
    if (installPrompt) {
      install.classList.remove('bi-hidden');
      manual.classList.add('bi-hidden');
    } else {
      install.classList.add('bi-hidden');
      manual.classList.remove('bi-hidden');
      overlay.querySelector('#biStatus').textContent =
        'التجهيز اكتمل. لو لم يظهر زر التثبيت التلقائي، استخدم قائمة Chrome ⋮ ثم «تثبيت التطبيق».';
    }
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
    if (overlay && prepared) revealInstallAction();
  });

  window.addEventListener('appinstalled', () => {
    if (installButton) installButton.remove();
    if (!overlay) return;
    const el = id => overlay.querySelector('#' + id);
    el('biTitle').textContent = 'تم تثبيت التطبيق بنجاح!';
    el('biIntro').textContent = 'بوابة التمريض أصبحت جاهزة. يمكنك فتحها الآن من هنا.';
    el('biProgressArea').classList.add('bi-hidden');
    el('biInstall').classList.add('bi-hidden');
    el('biManual').classList.add('bi-hidden');
    el('biOpen').classList.remove('bi-hidden');
  });

  registerWorker();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addInstallButton, { once: true });
  } else {
    addInstallButton();
  }
})();