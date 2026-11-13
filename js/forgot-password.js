import { auth } from "./config.js";

import {
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const form = document.getElementById("resetForm");
const emailInput = document.getElementById("email");
const button = document.getElementById("resetButton");
const message = document.getElementById("message");

function showMessage(text, type = "error") {
  message.textContent = text;
  message.className = `message ${type}`;
}

function getArabicError(code) {
  const errors = {
    "auth/invalid-email": "البريد الإلكتروني غير صحيح.",
    "auth/missing-email": "اكتب البريد الإلكتروني أولًا.",
    "auth/too-many-requests": "محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.",
    "auth/network-request-failed": "تعذر الاتصال. تحقق من الإنترنت وحاول مرة أخرى.",
    "auth/unauthorized-domain": "دومين الموقع غير مضاف إلى Authorized domains في Firebase.",
    "auth/operation-not-allowed": "إرسال روابط استعادة كلمة المرور غير متاح حاليًا."
  };
  return errors[code] || "تعذر إرسال الرابط حاليًا. كود الخطأ: " + (code || "غير معروف");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = emailInput.value.trim();
  if (!email) {
    showMessage("اكتب البريد الإلكتروني أولًا.");
    return;
  }

  button.disabled = true;
  button.textContent = "جاري الإرسال...";

  try {
    await sendPasswordResetEmail(auth, email);
    showMessage(
      "إذا كان البريد مرتبطًا بحساب، فسيصلك رابط إعادة التعيين. راجع صندوق الوارد والرسائل غير المرغوب فيها.",
      "success"
    );
  } catch (error) {
    console.error("Password reset error:", error);
    showMessage(getArabicError(error.code));
  } finally {
    button.disabled = false;
    button.textContent = "إرسال رابط الاستعادة";
  }
});
