import { auth } from "./config.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithRedirect
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitButton = document.getElementById("loginButton");
const googleButton = document.getElementById("googleLoginButton");
const messageBox = document.getElementById("message");

function showMessage(message, type = "error") {
  if (!messageBox) return;
  messageBox.textContent = message;
  messageBox.className = `message ${type}`;
}

function hideMessage() {
  if (!messageBox) return;
  messageBox.textContent = "";
  messageBox.className = "message";
}

function getArabicError(code) {
  const errors = {
    "auth/invalid-email": "البريد الإلكتروني غير صحيح.",
    "auth/user-not-found": "لا يوجد حساب مسجل بهذا البريد الإلكتروني.",
    "auth/wrong-password": "كلمة المرور غير صحيحة.",
    "auth/invalid-credential": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    "auth/user-disabled": "تم إيقاف هذا الحساب. تواصل مع الإدارة.",
    "auth/too-many-requests": "محاولات كثيرة. حاول مرة أخرى بعد قليل.",
    "auth/network-request-failed": "تعذر الاتصال. تحقق من الإنترنت وحاول مرة أخرى.",
    "auth/operation-not-allowed": "طريقة تسجيل الدخول هذه غير مفعّلة في Firebase.",
    "auth/unauthorized-domain": "دومين الموقع غير مضاف إلى Authorized domains في Firebase.",
    "auth/popup-blocked": "المتصفح منع نافذة تسجيل الدخول. اسمح بالنوافذ المنبثقة أو أعد المحاولة.",
    "auth/account-exists-with-different-credential": "هذا البريد مرتبط بطريقة تسجيل دخول أخرى. سجّل بالطريقة الأصلية أولًا.",
    "auth/credential-already-in-use": "بيانات حساب Google مرتبطة بحساب آخر.",
    "auth/cancelled-popup-request": "تم إلغاء محاولة تسجيل الدخول. حاول مرة أخرى."
  };
  return errors[code] || "تعذر تسجيل الدخول حاليًا. كود الخطأ: " + (code || "غير معروف");
}

onAuthStateChanged(auth, (user) => {
  if (user) window.location.replace("dashboard.html");
});

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    hideMessage();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      showMessage("اكتب البريد الإلكتروني وكلمة المرور.");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "جاري تسجيل الدخول...";

    try {
      await signInWithEmailAndPassword(auth, email, password);
      showMessage("تم تسجيل الدخول بنجاح.", "success");
      window.location.replace("dashboard.html");
    } catch (error) {
      console.error("Login error:", error);
      showMessage(getArabicError(error.code));
      submitButton.disabled = false;
      submitButton.textContent = "تسجيل الدخول";
    }
  });
}

if (googleButton) {
  googleButton.addEventListener("click", async () => {
    hideMessage();
    googleButton.disabled = true;
    googleButton.textContent = "جاري تحويلك إلى Google...";
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Google sign-in error:", error);
      showMessage(getArabicError(error.code));
      googleButton.disabled = false;
      googleButton.textContent = "المتابعة باستخدام Google";
    }
  });
}
