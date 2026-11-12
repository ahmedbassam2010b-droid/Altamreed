import { auth, db } from "./config.js";

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc
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
    const subjectSnapshot = await getDoc(doc(db, "subjects", subjectId));
    if (!subjectSnapshot.exists() || subjectSnapshot.data().published !== true) {
      showMessage("المادة غير موجودة أو لم تعد منشورة.");
      return;
    }

    const subjectData = subjectSnapshot.data();
    if (subjectTitle) {
      subjectTitle.textContent = subjectData.title || "دروس المادة";
    }

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
      item.className = "dashboard-card lesson-card";

      const title = document.createElement("h3");
      title.textContent = lessonData.title || "درس بدون عنوان";

      const status = document.createElement("p");
      status.textContent = "تفاصيل عرض الدرس ستتاح بعد اعتماد مخطط محتوى الدروس.";

      item.append(title, status);
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
    window.location.replace("login.html");
    return;
  }

  loadLessons();
});
