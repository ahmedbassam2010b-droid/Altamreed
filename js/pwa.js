(() => {
  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  let installPrompt = null;

  function registerWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      }, { once: true });
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
    btn.addEventListener('click', () => {
      window.location.href = '/install.html';
    });
    document.body.appendChild(btn);
  }

  function setupInstallPage() {
    const $ = id => document.getElementById(id);
    const progressArea = $('progressArea');
    if (!progressArea) return;

    const assets = [
      '/', '/manifest.webmanifest', '/assets/images/logo.png',
      '/assets/images/favicon.png', '/assets/css/style.css',
      '/assets/css/index.css', '/js/site-footer.js', '/js/pwa.js'
    ];
    const cacheName = 'bawabet-static-v2';
    const percent = $('percent');
    const bar = $('progress');
    const status = $('status');
    const installBtn = $('installBtn');
    const successArea = $('successArea');
    const manualArea = $('manualArea');

    function setProgress(done, total) {
      const value = Math.round(done / total * 100);
      percent.textContent = value + '%';
      bar.style.width = value + '%';
    }

    async function prepareApp() {
      let done = 0;
      setProgress(0, assets.length);
      try {
        const cache = await caches.open(cacheName);
        for (const path of assets) {
          try {
            const response = await fetch(path, { cache: 'reload' });
            if (response.ok) await cache.put(path, response.clone());
          } catch (_) {
            // A failed optional asset does not prevent the installation step.
          }
          done++;
          setProgress(done, assets.length);
          status.textContent = 'تم تجهيز ' + done + ' من ' + assets.length + ' ملفات';
        }
        status.textContent = 'اكتمل تجهيز ملفات التطبيق';
        $('intro').textContent = 'الملفات الأساسية جاهزة. اضغط لتشغيل خطوة التثبيت الرسمية من المتصفح.';
        if (installPrompt) {
          installBtn.disabled = false;
          installBtn.classList.remove('hidden');
        } else {
          status.textContent = 'التجهيز اكتمل — في انتظار خيار التثبيت من المتصفح';
          setTimeout(showManualIfNeeded, 1200);
        }
      } catch (_) {
        status.textContent = 'تعذر تجهيز بعض الملفات. يمكنك متابعة التثبيت من المتصفح.';
        showManualIfNeeded();
      }
    }

    function showManualIfNeeded() {
      if (installPrompt || !installBtn.classList.contains('hidden')) return;
      manualArea.classList.remove('hidden');
      $('homeBtn').addEventListener('click', () => {
        window.location.href = '/';
      }, { once: true });
    }

    function showSuccess() {
      progressArea.classList.add('hidden');
      installBtn.classList.add('hidden');
      manualArea.classList.add('hidden');
      successArea.classList.remove('hidden');
    }

    installBtn.addEventListener('click', async () => {
      if (!installPrompt) {
        showManualIfNeeded();
        return;
      }
      const promptEvent = installPrompt;
      installPrompt = null;
      // Must be called directly from this tap; Android controls the native dialog.
      promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice && choice.outcome === 'accepted') {
        showSuccess();
      } else {
        status.textContent = 'لم يتم التثبيت. يمكنك المحاولة مرة أخرى.';
        installPrompt = null;
        manualArea.classList.remove('hidden');
      }
    });

    $('openBtn').addEventListener('click', () => {
      window.location.href = '/';
    });

    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      installPrompt = event;
      if (percent.textContent === '100%') {
        installBtn.disabled = false;
        installBtn.classList.remove('hidden');
        manualArea.classList.add('hidden');
      }
    });

    window.addEventListener('appinstalled', showSuccess);
    if (isStandalone()) {
      showSuccess();
      $('intro').textContent = 'بوابة التمريض مثبتة بالفعل على هذا الجهاز.';
      return;
    }
    prepareApp();
  }

  registerWorker();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (location.pathname.endsWith('/install.html')) setupInstallPage();
      else addInstallButton();
    }, { once: true });
  } else {
    if (location.pathname.endsWith('/install.html')) setupInstallPage();
    else addInstallButton();
  }

  window.addEventListener('appinstalled', () => {
    const button = document.getElementById('bawabetInstallApp');
    if (button) button.remove();
  });
})();