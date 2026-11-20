import { auth } from "./config.js";
import {
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const params = new URLSearchParams(window.location.search);
const mode = params.get("mode");
const actionCode = params.get("oobCode");
const title = document.getElementById("actionTitle");
const description = document.getElementById("actionDescription");
const message = document.getElementById("actionMessage");
const resetForm = document.getElementById("passwordResetForm");
const loginButton = document.getElementById("loginActionButton");
const confirmEmailButton = document.getElementById("confirmEmailButton");
const saveButton = document.getElementById("savePasswordButton");
let verifiedResetEmail = "";

function showMessage(text, type = "info") {
  message.textContent = text;
  message.className = `message ${type}`;
}
function showLogin(text) {
  showMessage(text, "success");
  loginButton.hidden = false;
}
function invalidLink() {
  title.textContent = "الرابط غير صالح أو انتهت صلاحيته";
  description.textContent = "اطلب رسالة جديدة من بوابة التمريض ثم افتح أحدث رابط وصلك.";
  showMessage("تعذر تنفيذ الطلب. قد يكون الرابط مستخدمًا من قبل أو انتهت صلاحيته.", "error");
  loginButton.hidden = false;
}

async function handleVerifyEmail() {
  title.textContent = "تأكيد البريد الإلكتروني";
  description.textContent = "اضغط على الزر بالأسفل لإكمال تأكيد بريدك الإلكتروني.";
  showMessage("الرابط جاهز. لن يتم تأكيد البريد إلا بعد ضغطك على زر التأكيد.", "info");
  confirmEmailButton.hidden = false;
  confirmEmailButton.addEventListener("click", async () => {
    confirmEmailButton.disabled = true;
    confirmEmailButton.textContent = "جارٍ تأكيد البريد...";
    try {
      await applyActionCode(auth, actionCode);
      confirmEmailButton.hidden = true;
      title.textContent = "تم تأكيد بريدك الإلكتروني بنجاح";
      description.textContent = "أصبح حسابك جاهزًا. يمكنك الآن تسجيل الدخول إلى بوابة التمريض ومتابعة دراستك.";
      showLogin("تم تفعيل بريدك الإلكتروني بنجاح. أهلًا بك في بوابة التمريض.");
    } catch (error) {
      console.error("Email verification action failed:", error);
      confirmEmailButton.disabled = false;
      confirmEmailButton.textContent = "تأكيد البريد الإلكتروني";
      showMessage("تعذر تأكيد البريد. قد يكون الرابط غير صالح أو انتهت صلاحيته. اطلب رسالة جديدة.", "error");
    }
  }, { once: true });
}

async function handlePasswordReset() {
  title.textContent = "إنشاء كلمة مرور جديدة";
  description.textContent = "اكتب كلمة مرور جديدة لحسابك، ثم أكدها.";
  verifiedResetEmail = await verifyPasswordResetCode(auth, actionCode);
  showMessage("رابط الاستعادة صالح للحساب: " + verifiedResetEmail, "success");
  resetForm.hidden = false;
}

resetForm.addEventListener("submit", async event => {
  event.preventDefault();
  const password = document.getElementById("newPassword").value;
  const confirmation = document.getElementById("confirmPassword").value;
  if (password.length < 6) return showMessage("كلمة المرور يجب ألا تقل عن 6 أحرف.", "error");
  if (password !== confirmation) return showMessage("كلمتا المرور غير متطابقتين.", "error");
  saveButton.disabled = true;
  saveButton.textContent = "جارٍ حفظ كلمة المرور...";
  try {
    await confirmPasswordReset(auth, actionCode, password);
    resetForm.hidden = true;
    title.textContent = "تم تحديث كلمة المرور بنجاح";
    description.textContent = "تم حفظ كلمة المرور الجديدة. يمكنك الآن تسجيل الدخول إلى حسابك.";
    showLogin("تم تغيير كلمة المرور بنجاح.", "success");
  } catch (error) {
    console.error("Password reset action failed:", error);
    showMessage(error.code === "auth/expired-action-code" || error.code === "auth/invalid-action-code"
      ? "رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا."
      : "تعذر تغيير كلمة المرور الآن. حاول مرة أخرى.", "error");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "حفظ كلمة المرور الجديدة";
  }
});

(async () => {
  if (!actionCode || !mode) return invalidLink();
  try {
    if (mode === "verifyEmail") await handleVerifyEmail();
    else if (mode === "resetPassword") await handlePasswordReset();
    else invalidLink();
  } catch (error) {
    console.error("Email action failed:", error);
    invalidLink();
  }
})();
