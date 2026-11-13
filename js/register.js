import { auth, db } from "./config.js";
import {
  createUserWithEmailAndPassword, updateProfile, onAuthStateChanged,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  collection, getDocs, doc, getDoc, setDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const form = document.getElementById("registerForm");
const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const gradeSelect = document.getElementById("gradeId");
const googleGradeSelect = document.getElementById("googleGradeId");
const googleGradePanel = document.getElementById("googleGradePanel");
const saveGoogleGradeButton = document.getElementById("saveGoogleGradeButton");
const button = document.getElementById("registerButton");
const googleButton = document.getElementById("googleRegisterButton");
const message = document.getElementById("message");
let activeGrades = [];
let currentGoogleUser = null;
let creatingEmailAccount = false;

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
    "auth/account-exists-with-different-credential": "هذا البريد مرتبط بطريقة تسجيل دخول أخرى. سجّل بالطريقة الأصلية.",
    "auth/popup-blocked": "المتصفح منع نافذة تسجيل الدخول. أعد المحاولة.",
    "auth/credential-already-in-use": "حساب Google مرتبط بحساب آخر."
  };
  return errors[code] || "تعذر إنشاء الحساب. كود الخطأ: " + (code || "غير معروف");
}
function fillGradeSelect(select) {
  if (!select) return;
  select.replaceChildren(new Option("اختر الصف الدراسي", ""));
  activeGrades.forEach(g => select.add(new Option(g.name, g.id)));
  select.disabled = !activeGrades.length;
}
async function loadGrades() {
  const snapshot = await getDocs(collection(db, "grades"));
  activeGrades = snapshot.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(g => g.active === true && typeof g.name === "string" && g.name.trim())
    .sort((a,b) => (Number(a.order)||0) - (Number(b.order)||0));
  fillGradeSelect(gradeSelect);
  fillGradeSelect(googleGradeSelect);
  if (!activeGrades.length) showMessage("لا توجد صفوف دراسية متاحة حاليًا. تواصل مع الإدارة.", "error");
}
async function saveStudentProfile(user, gradeId, displayName) {
  const grade = activeGrades.find(g => g.id === gradeId);
  if (!grade) throw new Error("INVALID_GRADE");
  const profileRef = doc(db, "users", user.uid);
  const existing = await getDoc(profileRef);
  const profile = {
    uid: user.uid,
    displayName: displayName || user.displayName || "طالب",
    email: user.email || "",
    gradeId: grade.id,
    gradeName: grade.name,
    updatedAt: serverTimestamp()
  };
  if (existing.exists()) {
    if (existing.data().gradeId && existing.data().gradeId !== grade.id) {
      throw new Error("GRADE_ALREADY_ASSIGNED");
    }
    await updateDoc(profileRef, { gradeId: grade.id, gradeName: grade.name, updatedAt: serverTimestamp() });
  } else {
    await setDoc(profileRef, { ...profile, xp: 0, createdAt: serverTimestamp() });
  }
  const publicRef = doc(db, "publicProfiles", user.uid);
  const publicSnap = await getDoc(publicRef);
  if (!publicSnap.exists()) {
    await setDoc(publicRef, { displayName: profile.displayName, xp: 0, updatedAt: serverTimestamp() });
  }
}
async function handleSignedInUser(user) {
  if (!user || creatingEmailAccount) return;
  const snap = await getDoc(doc(db, "users", user.uid));
  if (snap.exists() && snap.data().gradeId) {
    window.location.replace("dashboard.html");
    return;
  }
  currentGoogleUser = user;
  googleGradePanel.hidden = false;
  if (googleButton) googleButton.hidden = true;
  showMessage("حساب Google جاهز. اختار صفك الدراسي لإكمال التسجيل.", "success");
}

onAuthStateChanged(auth, user => {
  if (user) handleSignedInUser(user).catch(error => {
    console.error("Account setup check failed:", error);
    showMessage("تعذر التحقق من بيانات الحساب. حاول تحديث الصفحة.");
  });
});

if (form) {
  form.addEventListener("submit", async event => {
    event.preventDefault();
    message.className = "message";
    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const gradeId = gradeSelect.value;
    if (fullName.length < 3) return showMessage("اكتب اسمك بالكامل (3 أحرف على الأقل).");
    if (!activeGrades.some(g => g.id === gradeId)) return showMessage("اختار صفك الدراسي من القائمة.");
    if (password !== confirmPassword) return showMessage("كلمتا المرور غير متطابقتين.");
    creatingEmailAccount = true;
    button.disabled = true;
    button.textContent = "جاري إنشاء الحساب...";
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: fullName });
      await saveStudentProfile(credential.user, gradeId, fullName);
      showMessage("تم إنشاء الحساب وحفظ صفك الدراسي بنجاح.", "success");
      window.location.replace("dashboard.html");
    } catch (error) {
      console.error("Registration error:", error);
      showMessage(error.message === "INVALID_GRADE" ? "الصف المختار غير متاح." :
        error.message === "GRADE_ALREADY_ASSIGNED" ? "هذا الحساب مرتبط بصف دراسي بالفعل. تواصل مع الإدارة لتغييره." :
        translateError(error.code));
    } finally {
      creatingEmailAccount = false;
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
if (saveGoogleGradeButton) {
  saveGoogleGradeButton.addEventListener("click", async () => {
    if (!currentGoogleUser) return showMessage("سجّل الدخول أولًا.");
    const gradeId = googleGradeSelect.value;
    if (!activeGrades.some(g => g.id === gradeId)) return showMessage("اختار صفك الدراسي.");
    saveGoogleGradeButton.disabled = true;
    try {
      await saveStudentProfile(currentGoogleUser, gradeId);
      showMessage("تم حفظ الصف الدراسي. جاري فتح المنصة...", "success");
      window.location.replace("dashboard.html");
    } catch (error) {
      console.error("Google profile setup failed:", error);
      showMessage(error.message === "GRADE_ALREADY_ASSIGNED" ? "هذا الحساب مرتبط بصف دراسي بالفعل." : "تعذر حفظ الصف. راجع صلاحيات Firestore.");
      saveGoogleGradeButton.disabled = false;
    }
  });
}
loadGrades().catch(error => {
  console.error("Grade list load failed:", error);
  showMessage("تعذر تحميل الصفوف الدراسية. حاول مرة أخرى.");
});
