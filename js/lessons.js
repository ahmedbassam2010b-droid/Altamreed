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

async function loadLessons(user) {
  if (!lessonsList) return;

  if (!subjectId) {
    showMessage("لم يتم تحديد المادة المطلوبة.");
    return;
  }

  lessonsList.replaceChildren();
  showMessage("جاري تحميل الدروس...");

  try {
    const profile = await getDoc(doc(db, "users", user.uid));
    const gradeId = profile.exists() ? profile.data().gradeId : "";
    if (!gradeId) { window.location.replace("register.html"); return; }
    const subjectSnapshot = await getDoc(doc(db, "subjects", subjectId));
    if (!subjectSnapshot.exists() || subjectSnapshot.data().published !== true || subjectSnapshot.data().gradeId !== gradeId) {
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
      where("gradeId", "==", gradeId)
    );

    const snapshot = await getDocs(lessonsQuery);

    if (snapshot.empty) {
      showMessage("لا توجد دروس منشورة في هذه المادة حاليًا.");
      return;
    }

    const records = snapshot.docs
      .map((documentSnapshot) => ({
        id: documentSnapshot.id,
        data: documentSnapshot.data()
      }))
      .sort((a, b) => (Number(a.data.order) || 0) - (Number(b.data.order) || 0));

    const fragment = document.createDocumentFragment();

    records.forEach(({ data }) => {
      const item = document.createElement("article");
      item.className = "dashboard-card lesson-card";

      const title = document.createElement("h3");
      title.textContent = data.title || "درس بدون عنوان";

      item.append(title);
      const blocks = Array.isArray(data.contentBlocks) ? data.contentBlocks : [];
      if (blocks.length) {
        const details = document.createElement("details");
        details.className = "lesson-content-details";
        const summary = document.createElement("summary");
        summary.textContent = "فتح محتوى الدرس";
        details.append(summary);
        const body = document.createElement("div");
        body.className = "lesson-content-body";
        blocks.forEach((block) => {
          if (!block || typeof block !== "object") return;
          if (block.type === "image") {
            const figure = document.createElement("figure");
            figure.className = "lesson-content-figure";
            const img = document.createElement("img");
            img.src = block.url || "";
            img.alt = block.alt || block.caption || "Anatomy educational illustration";
            img.loading = "lazy";
            img.decoding = "async";
            figure.append(img);
            if (block.caption) {
              const caption = document.createElement("figcaption");
              caption.textContent = block.caption;
              figure.append(caption);
            }
            body.append(figure);
          } else if (block.type === "bilingual" && Array.isArray(block.points)) {
            const section = document.createElement("section");
            section.className = "lesson-bilingual-section";
            if (block.title) {
              const heading = document.createElement("h5");
              heading.textContent = block.title;
              section.append(heading);
            }
            block.points.forEach((point) => {
              const card = document.createElement("div");
              card.className = "lesson-bilingual-point";
              if (point.en) {
                const en = document.createElement("p");
                en.className = "lesson-point-en";
                en.textContent = point.en;
                card.append(en);
              }
              if (point.ar) {
                const ar = document.createElement("p");
                ar.className = "lesson-point-ar";
                ar.textContent = point.ar;
                card.append(ar);
              }
              if (point.simple) {
                const simple = document.createElement("p");
                simple.className = "lesson-point-simple";
                simple.textContent = point.simple;
                card.append(simple);
              }
              section.append(card);
            });
            body.append(section);
          } else if (block.type === "heading" || block.type === "subheading") {
            const h = document.createElement(block.type === "heading" ? "h4" : "h5");
            h.textContent = block.text || "";
            body.append(h);
          } else if (block.type === "paragraph") {
            const p = document.createElement("p");
            p.textContent = block.text || "";
            body.append(p);
          } else if (block.type === "list" && Array.isArray(block.items)) {
            const ul = document.createElement("ul");
            block.items.forEach((entry) => {
              const li = document.createElement("li");
              li.textContent = String(entry);
              ul.append(li);
            });
            body.append(ul);
          } else if (block.type === "warning") {
            const aside = document.createElement("aside");
            aside.className = "lesson-content-warning";
            const strong = document.createElement("strong");
            strong.textContent = block.title || "تنبيه";
            const p = document.createElement("p");
            p.textContent = block.text || "";
            aside.append(strong, p);
            body.append(aside);
          }
        });
        details.append(body);
        item.append(details);
      } else {
        const status = document.createElement("p");
        status.textContent = "لا يتوفر محتوى تفصيلي لهذا الدرس حاليًا.";
        item.append(status);
      }
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

  loadLessons(user);
});
