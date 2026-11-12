
import { auth, db } from "./config.js";

import {
  collection,
  getDocs,
  query,
  where,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const lessonsList = document.getElementById("lessonsList");
const lessonsMessage = document.getElementById("lessonsMessage");
const subjectTitle = document.getElementById("subjectTitle");

const params = new URLSearchParams(window.location.search);
const subjectId = params.get("id");

function showMessage(message) {
  if (lessonsMessage) {
    lessonsMessage.textContent = message;
  }
}

async function loadLessons() {
  if (!lessonsList) return;

  if (!subjectId) {
    showMessage("لم يتم تحديد المادة المطلوبة.");
    return;
  }

  lessonsList.replaceChildren();
  showMessage("جاري تحميل الدروس...");

  try {
    const lessonsQuery = query(
      collection(db, "lessons"),
      where("subjectId", "==", subjectId),
      where("published", "==", true),
      orderBy("order", "asc")
    );

    const snapshot = await getDocs(lessonsQuery);

    if (snapshot.empty) {
      showMessage("لا توجد دروس منشورة في هذه المادة حاليًا.");
      return;
    }

    const fragment = document.createDocumentFragment();

    snapshot.forEach((documentSnapshot) => {
      const lessonData = documentSnapshot.data();

      const item = document.createElement("article");
      item.className = "lesson-card";

      const title = document.createElement("h3");
      title.textContent = lessonData.title || "درس بدون عنوان";

      const link = document.createElement("a");
      link.href = `lesson.html?id=${encodeURIComponent(documentSnapshot.id)}`;
      link.textContent = "فتح الدرس";

      item.append(title, link);
      fragment.appendChild(item);
    });

    lessonsList.appendChild(fragment);
    showMessage("");
  } catch (error) {
    console.error("Error loading lessons:", error);
    showMessage("تعذر تحميل الدروس. حاول مرة أخرى.");
  }
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  loadLessons();
});
