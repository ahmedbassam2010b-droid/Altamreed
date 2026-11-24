(() => {
  let installPrompt = null;
  const addInstallButton = () => {
    if (document.getElementById('bawabetInstallApp')) return;
    const btn = document.createElement('button');
    btn.id = 'bawabetInstallApp';
    btn.type = 'button';
    btn.textContent = '⬇ تثبيت التطبيق';
    btn.setAttribute('aria-label','تثبيت تطبيق بوابة التمريض على الهاتف');
    Object.assign(btn.style,{
      position:'fixed',bottom:'18px',left:'16px',zIndex:'99999',
      border:0,borderRadius:'999px',padding:'13px 19px',
      background:'#123b5a',color:'#fff',font:'700 14px system-ui',
      boxShadow:'0 6px 22px rgba(0,0,0,.22)',cursor:'pointer',
      display:'none'
    });
    btn.addEventListener('click',async()=>{
      if (!installPrompt) {
        alert('لتثبيت بوابة التمريض: افتح قائمة المتصفح ⋮ ثم اختر «إضافة إلى الشاشة الرئيسية» أو «تثبيت التطبيق».');
        return;
      }
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt=null;
      btn.remove();
    });
    document.body.appendChild(btn);
    window.addEventListener('beforeinstallprompt',e=>{
      e.preventDefault(); installPrompt=e; btn.style.display='block';
    });
    window.addEventListener('appinstalled',()=>{installPrompt=null;btn.remove();});
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) btn.style.display='block';
  };
  if ('serviceWorker' in navigator) {
    window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',addInstallButton);
  else addInstallButton();
})();