
import { auth } from "./config.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitButton = document.getElementById("loginButton");
const messageBox = document.getElementById("message");

// عرض الرسائل
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

// ترجمة أخطاء Firebase
function getArabicError(errorCode) {
  const errors = {
    "auth/invalid-email":
      "البريد الإلكتروني غير صحيح.",

    "auth/user-not-found":
      "لا يوجد حساب مسجل بهذا البريد الإلكتروني.",

    "auth/wrong-password":
      "كلمة المرور غير صحيحة.",

    "auth/invalid-credential":
      "البريد الإلكتروني أو كلمة المرور غير صحيحة.",

    "auth/user-disabled":
      "تم إيقاف هذا الحساب. تواصل مع الإدارة.",

    "auth/too-many-requests":
      "محاولات كثيرة. حاول مرة أخرى بعد قليل.",

    "auth/network-request-failed":
      "تأكد من اتصالك بالإنترنت وحاول مرة أخرى.",

    "auth/operation-not-allowed":
      "تسجيل الدخول بالبريد الإلكتروني غير مُفعّل في Firebase."
  };

  return errors[errorCode] ||
    "حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.";
}

// متابعة حالة تسجيل الدخول
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.replace("dashboard.html");
  }
});

// تنفيذ تسجيل الدخول
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
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

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
