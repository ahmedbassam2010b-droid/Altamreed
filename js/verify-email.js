import { auth } from "./config.js";
import { emailActionSettings } from "./auth-email-settings.js";
import { onAuthStateChanged, sendEmailVerification, reload } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const message = document.getElementById("message");
const emailLabel = document.getElementById("verificationEmail");
const checkButton = document.getElementById("checkVerificationButton");
const resendButton = document.getElementById("resendVerificationButton");
let currentUser = null;

function showMessage(text, type = "error") {
  message.textContent = text;
  message.className = `message ${type}`;
}

onAuthStateChanged(auth, user => {
  currentUser = user;
  if (!user) {
    window.location.replace("login");
    return;
  }
  if (user.emailVerified) {
    window.location.replace("dashboard");
    return;
  }
  emailLabel.textContent = "رسالة التأكيد مُرسلة إلى: " + (user.email || "بريدك الإلكتروني");
});

checkButton.addEventListener("click", async () => {
  if (!currentUser) return;
  checkButton.disabled = true;
  try {
    await reload(currentUser);
    currentUser = auth.currentUser;
    if (currentUser.emailVerified) {
      showMessage("تم تأكيد البريد بنجاح. جاري فتح المنصة...", "success");
      window.location.replace("dashboard");
    } else {
      showMessage("لم يتم رصد التأكيد حتى الآن. افتح رابط الرسالة أولًا ثم أعد المحاولة.");
    }
  } catch (error) {
    console.error("Email verification check failed:", error);
    showMessage("تعذر التحقق الآن. تأكد من اتصال الإنترنت وحاول مرة أخرى.");
  } finally {
    checkButton.disabled = false;
  }
});

resendButton.addEventListener("click", async () => {
  if (!currentUser) return;
  resendButton.disabled = true;
  try {
    await reload(currentUser);
    currentUser = auth.currentUser;
    if (currentUser.emailVerified) {
      window.location.replace("dashboard");
      return;
    }
    await sendEmailVerification(currentUser, emailActionSettings);
    showMessage("تم إرسال رسالة تأكيد جديدة. راجع الوارد والرسائل غير المرغوب فيها.", "success");
  } catch (error) {
    console.error("Email verification resend failed:", error);
    const messages = {
      "auth/too-many-requests": "تم طلب رسائل كثيرة. انتظر قليلًا قبل إعادة المحاولة.",
      "auth/network-request-failed": "تعذر الاتصال. تحقق من الإنترنت وحاول مرة أخرى."
    };
    showMessage(messages[error.code] || "تعذر إرسال الرسالة الآن. حاول مرة أخرى لاحقًا.");
  } finally {
    resendButton.disabled = false;
  }
});
