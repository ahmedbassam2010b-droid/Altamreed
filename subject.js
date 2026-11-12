
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

const subjectsGrid = document.getElementById("subjectsGrid");
const subjectsMessage = document.getElementById("subjectsMessage");

function showMessage(message) {
  if (subjectsMessage) {
    subjectsMessage.textContent = message;
  }
}

function renderSubject(subjectId, data) {
  const card = document.createElement("article");
  card.className = "subject-card";

  const title = document.createElement("h3");
  title.textContent = data.title || "مادة بدون اسم";

  const description = document.createElement("p");
  description.textContent = data.description || "";

  const grade = document.createElement("p");
  grade.textContent = data.grade || "";

  const term = document.createElement("p");
  term.textContent = data.term || "";

  const link = document.createElement("a");
  link.href = `subject.html?id=${encodeURIComponent(subjectId)}`;
  link.textContent = "عرض المادة";

  card.append(title, description, grade, term, link);
  return card;
}

async function loadSubjects() {
  if (!subjectsGrid) return;

  subjectsGrid.replaceChildren();
  showMessage("جاري تحميل المواد...");

  try {
    const subjectsQuery = query(
      collection(db, "subjects"),
      where("published", "==", true),
      orderBy("order", "asc")
    );

    const snapshot = await getDocs(subjectsQuery);

    if (snapshot.empty) {
      showMessage("لا توجد مواد منشورة حاليًا.");
      return;
    }

    const fragment = document.createDocumentFragment();

    snapshot.forEach((documentSnapshot) => {
      const subject = renderSubject(
        documentSnapshot.id,
        documentSnapshot.data()
      );

      fragment.appendChild(subject);
    });

    subjectsGrid.appendChild(fragment);
    showMessage("");
  } catch (error) {
    console.error("Error loading subjects:", error);
    showMessage("تعذر تحميل المواد. حاول مرة أخرى.");
  }
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  loadSubjects();
});
