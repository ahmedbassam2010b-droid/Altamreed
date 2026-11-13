import { auth } from "./config.js";

import {
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const form = document.getElementById("registerForm");
const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const button = document.getElementById("registerButton");
const googleButton = document.getElementById("googleRegisterButton");
const message = document.getElementById("message");

function showMessage(text, type = "error") {
  message.textContent = text;
  message.className = `message ${type}`;
}

function translateError(code) {
  const errors = {
    "auth/email-already-in-use": "البريد الإلكتروني مسجل بالفعل. جرّب تسجيل الدخول.",
    "auth/invalid-email": "البريد الإلكتروني غير صحيح.",
    "auth/weak-password": "كلمة المرور ضعيفة. استخدم 6 أحرف على الأقل.",
    "auth/operation-not-allowed": "طريقة التسجيل هذه غير مفعّلة في Firebase.",
    "auth/network-request-failed": "تعذر الاتصال. تحقق من الإنترنت وحاول مرة أخرى.",
    "auth/unauthorized-domain": "دومين الموقع غير مضاف إلى Authorized domains في Firebase.",
    "auth/too-many-requests": "محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.",
    "auth/invalid-api-key": "إعداد Firebase API Key غير صالح. راجع إعدادات المشروع.",
    "auth/api-key-not-valid": "إعداد Firebase API Key غير صالح. راجع إعدادات المشروع.",
    "auth/account-exists-with-different-credential": "هذا البريد مرتبط بطريقة تسجيل دخول أخرى. سجّل بالطريقة الأصلية.",
    "auth/popup-blocked": "المتصفح منع نافذة تسجيل الدخول. أعد المحاولة.",
    "auth/credential-already-in-use": "حساب Google مرتبط بحساب آخر."
  };
  return errors[code] || "تعذر إنشاء الحساب. كود الخطأ: " + (code || "غير معروف");
}

onAuthStateChanged(auth, (user) => {
  if (user) window.location.replace("dashboard.html");
});

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.className = "message";

    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (fullName.length < 3) return showMessage("اكتب اسمك بالكامل (3 أحرف على الأقل).");
    if (password !== confirmPassword) return showMessage("كلمتا المرور غير متطابقتين.");

    button.disabled = true;
    button.textContent = "جاري إنشاء الحساب...";

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      try {
        await updateProfile(credential.user, { displayName: fullName });
      } catch (profileError) {
        console.error("Profile update after account creation failed:", profileError);
        showMessage("تم إنشاء الحساب، لكن تعذر حفظ الاسم الظاهر. سجّل الدخول وتواصل مع الإدارة إذا استمرت المشكلة.", "success");
        return;
      }

      showMessage("تم إنشاء الحساب بنجاح. جاري تحويلك...", "success");
      window.location.replace("dashboard.html");
    } catch (error) {
      console.error("Registration error:", error);
      showMessage(translateError(error.code));
    } finally {
      button.disabled = false;
      button.textContent = "إنشاء الحساب";
    }
  });
}

if (googleButton) {
  googleButton.addEventListener("click", async () => {
    message.className = "message";
    googleButton.disabled = true;
    googleButton.textContent = "جاري تحويلك إلى Google...";
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      try {
        await signInWithPopup(auth, provider);
      } catch (popupError) {
        if (popupError.code !== "auth/popup-blocked") throw popupError;
        await signInWithRedirect(auth, provider);
      }
    } catch (error) {
      console.error("Google registration error:", error);
      showMessage(translateError(error.code));
      googleButton.disabled = false;
      googleButton.textContent = "المتابعة باستخدام Google";
    }
  });
}
