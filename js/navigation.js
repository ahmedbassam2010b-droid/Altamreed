// navigation.js

import { auth, db } from "./config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const studentName = document.getElementById("studentName");
const logoutButton = document.getElementById("logoutButton");
const accountMessage = document.getElementById("accountMessage");

function showAccountMessage(message, type = "info") {
  if (!accountMessage) return;
  accountMessage.textContent = message;
  accountMessage.dataset.state = type;
  accountMessage.hidden = !message;
}

/**
 * Creates the student's own profile document on first authenticated visit.
 * Firestore Security Rules validate that the document ID, email and timestamp
 * belong to the authenticated user. No global or sample content is inserted.
 */
async function ensureStudentProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const userSnapshot = await getDoc(userRef);

  if (userSnapshot.exists()) return;

  const displayName = (user.displayName || "").trim();

  if (displayName.length < 3 || !user.email) {
    throw new Error("بيانات الحساب الأساسية غير مكتملة.");
  }

  await setDoc(userRef, {
    displayName,
    email: user.email,
    photoURL: user.photoURL || null,
    createdAt: serverTimestamp()
  });
}

// Protect authenticated pages and initialize the student's own profile.
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  if (studentName) {
    studentName.textContent = user.displayName || user.email || "الطالب";
  }

  showAccountMessage("جاري تجهيز بيانات حسابك...");

  try {
    await ensureStudentProfile(user);
    showAccountMessage("");
  } catch (error) {
    console.error("Student profile initialization failed:", error);
    showAccountMessage(
      "تم تسجيل الدخول، لكن تعذر تجهيز ملفك الدراسي في قاعدة البيانات. حاول تحديث الصفحة، وإذا استمرت المشكلة تواصل مع الإدارة.",
      "error"
    );
  }
});

// Sign out.
if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    logoutButton.textContent = "جاري تسجيل الخروج...";

    try {
      await signOut(auth);
      window.location.replace("login.html");
    } catch (error) {
      console.error("Logout error:", error);
      logoutButton.disabled = false;
      logoutButton.textContent = "تسجيل الخروج";
      alert("تعذر تسجيل الخروج. حاول مرة أخرى.");
    }
  });
}
