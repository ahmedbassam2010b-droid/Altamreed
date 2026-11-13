import { auth, db } from "./config.js";

import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc
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
  card.className = "dashboard-card subject-card";

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

async function loadSubjects(user) {
  if (!subjectsGrid) return;

  subjectsGrid.replaceChildren();
  showMessage("جاري تحميل المواد...");

  try {
    const profile = await getDoc(doc(db, "users", user.uid));
    const gradeId = profile.exists() ? profile.data().gradeId : "";
    if (!gradeId) { window.location.replace("register.html"); return; }
    const subjectsQuery = query(
      collection(db, "subjects"),
      where("published", "==", true),
      where("gradeId", "==", gradeId)
    );

    const snapshot = await getDocs(subjectsQuery);

    if (snapshot.empty) {
      showMessage("لا توجد مواد منشورة حاليًا.");
      return;
    }

    const records = snapshot.docs
      .map((documentSnapshot) => ({
        id: documentSnapshot.id,
        data: documentSnapshot.data()
      }))
      .sort((a, b) => (Number(a.data.order) || 0) - (Number(b.data.order) || 0));

    const fragment = document.createDocumentFragment();

    records.forEach(({ id, data }) => {
      fragment.appendChild(renderSubject(id, data));
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
    window.location.replace("login.html");
    return;
  }

  loadSubjects(user);
});
