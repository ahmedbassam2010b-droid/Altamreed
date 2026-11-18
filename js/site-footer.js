(() => {
  "use strict";
  const isNested = window.location.pathname.includes("/simulations/");
  const prefix = isNested ? "../" : "";
  const links = [
    ["من نحن", "about.html"],
    ["المؤسس والمطور", "founder.html"],
    ["تواصل معنا", "contact.html"],
    ["الأسئلة الشائعة", "faq.html"],
    ["سياسة الخصوصية", "privacy.html"],
    ["شروط الاستخدام", "terms.html"]
  ];
  const style = document.createElement("style");
  style.id = "bawabet-official-footer-style";
  style.textContent = `
    .bawabet-official-footer{box-sizing:border-box;width:100%;margin:36px auto 0;padding:22px max(18px,env(safe-area-inset-left)) calc(18px + env(safe-area-inset-bottom));background:#102b49;color:#eaf3fb;border-top:3px solid #18a6a0;font-family:inherit;position:relative;z-index:2}
    .bawabet-official-footer__inner{width:min(1120px,100%);margin:auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px}
    .bawabet-official-footer__brand{font-weight:900;font-size:14px;line-height:1.8}
    .bawabet-official-footer__brand small{display:block;color:#b8cad9;font-size:11px;font-weight:500}
    .bawabet-official-footer__links{display:flex;flex-wrap:wrap;gap:8px 18px;margin:0;padding:0;list-style:none}
    .bawabet-official-footer a{color:#eaf3fb;text-decoration:none;font-size:13px;font-weight:650}
    .bawabet-official-footer a:hover,.bawabet-official-footer a:focus-visible{color:#61ded2;text-decoration:underline}
    .bawabet-official-footer__copy{width:100%;padding-top:12px;border-top:1px solid #ffffff25;color:#b8cad9;font-size:11px}
    @media(max-width:640px){.bawabet-official-footer{padding:20px 16px calc(18px + env(safe-area-inset-bottom))}.bawabet-official-footer__inner{display:block}.bawabet-official-footer__links{margin-top:12px;gap:12px 16px}.bawabet-official-footer__links li{max-width:100%}.bawabet-official-footer__copy{margin-top:16px}}
  `;
  if (!document.getElementById(style.id)) document.head.appendChild(style);
  if (document.getElementById("bawabet-official-footer")) return;
  const footer = document.createElement("footer");
  footer.id = "bawabet-official-footer";
  footer.classList.add("bawabet-official-footer");
  footer.setAttribute("aria-label", "روابط بوابة التمريض الرسمية");
  footer.innerHTML = `
    <div class="bawabet-official-footer__inner">
      <div class="bawabet-official-footer__brand">بوابة التمريض <small>BAWABET AL TAMREED</small></div>
      <nav aria-label="الصفحات الرسمية">
        <ul class="bawabet-official-footer__links">
          ${links.map(([label, href]) => `<li><a href="${prefix + href}">${label}</a></li>`).join("")}
        </ul>
      </nav>
      <div class="bawabet-official-footer__copy">© 2026 بوابة التمريض. جميع الحقوق محفوظة.</div>
    </div>`;
  document.body.appendChild(footer);
})();