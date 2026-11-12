// navigation.js

import { auth } from "./config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const studentName = document.getElementById("studentName");
const logoutButton = document.getElementById("logoutButton");

// حماية الصفحات التي تستخدم navigation.js
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  if (studentName) {
    studentName.textContent =
      user.displayName ||
      user.email ||
      "الطالب";
  }
});

// تسجيل الخروج
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
