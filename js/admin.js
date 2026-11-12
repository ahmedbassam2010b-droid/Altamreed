import { auth, db } from "./config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const statusBox = document.getElementById("adminStatus");
const workspace = document.getElementById("adminWorkspace");
const subjectForm = document.getElementById("subjectForm");
const lessonForm = document.getElementById("lessonForm");
const subjectSelect = document.getElementById("lessonSubject");
const subjectsList = document.getElementById("subjectsAdminList");
const logoutButton = document.getElementById("adminLogout");

function setStatus(message, state = "info") {
  statusBox.textContent = message;
  statusBox.dataset.state = state;
}

function setFormBusy(form, busy, idleText, busyText) {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = busy;
  button.textContent = busy ? busyText : idleText;
}

function appendSubjectOption(id, data) {
  const option = document.createElement("option");
  option.value = id;
  option.textContent = data.title || "مادة بدون اسم";
  subjectSelect.appendChild(option);
}

function renderSubject(id, data) {
  const item = document.createElement("article");
  item.className = "admin-list-item";

  const title = document.createElement("strong");
  title.textContent = data.title || "مادة بدون اسم";

  const details = document.createElement("p");
  details.textContent = [
    data.grade || "",
    data.term || "",
    data.published === true ? "منشورة" : "مسودة"
  ].filter(Boolean).join(" • ");

  item.append(title, details);
  return item;
}

async function loadSubjects() {
  const snapshot = await getDocs(collection(db, "subjects"));
  const records = snapshot.docs.map((item) => ({
    id: item.id,
    data: item.data()
  }));

  records.sort((a, b) => (Number(a.data.order) || 0) - (Number(b.data.order) || 0));

  subjectSelect.replaceChildren(new Option("اختر المادة", ""));
  subjectsList.replaceChildren();

  if (records.length === 0) {
    subjectsList.textContent = "لا توجد مواد حتى الآن. أضف مادة من النموذج بالأعلى.";
    return;
  }

  records.forEach(({ id, data }) => {
    appendSubjectOption(id, data);
    subjectsList.appendChild(renderSubject(id, data));
  });
}

subjectForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormBusy(subjectForm, true, "حفظ المادة في Firestore", "جاري الحفظ...");

  try {
    await addDoc(collection(db, "subjects"), {
      title: document.getElementById("subjectTitle").value.trim(),
      description: document.getElementById("subjectDescription").value.trim(),
      grade: document.getElementById("subjectGrade").value.trim(),
      term: document.getElementById("subjectTerm").value.trim(),
      order: Number(document.getElementById("subjectOrder").value),
      published: document.getElementById("subjectPublished").checked,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    subjectForm.reset();
    document.getElementById("subjectOrder").value = "1";
    await loadSubjects();
    setStatus("تم حفظ المادة بنجاح في Firestore.", "success");
  } catch (error) {
    console.error("Subject creation failed:", error);
    setStatus("تعذر حفظ المادة. تحقق من صلاحيات المدير واتصال الإنترنت.", "error");
  } finally {
    setFormBusy(subjectForm, false, "حفظ المادة في Firestore", "جاري الحفظ...");
  }
});

lessonForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormBusy(lessonForm, true, "حفظ الدرس في Firestore", "جاري الحفظ...");

  try {
    await addDoc(collection(db, "lessons"), {
      subjectId: subjectSelect.value,
      title: document.getElementById("lessonTitle").value.trim(),
      content: document.getElementById("lessonContent").value.trim(),
      order: Number(document.getElementById("lessonOrder").value),
      published: document.getElementById("lessonPublished").checked,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    lessonForm.reset();
    document.getElementById("lessonOrder").value = "1";
    await loadSubjects();
    setStatus("تم حفظ الدرس بنجاح في Firestore.", "success");
  } catch (error) {
    console.error("Lesson creation failed:", error);
    setStatus("تعذر حفظ الدرس. تحقق من صلاحيات المدير واتصال الإنترنت.", "error");
  } finally {
    setFormBusy(lessonForm, false, "حفظ الدرس في Firestore", "جاري الحفظ...");
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  try {
    const adminSnapshot = await getDoc(doc(db, "admins", user.uid));

    if (!adminSnapshot.exists()) {
      setStatus("هذا الحساب غير مسجل كمدير. لا يمكنك الوصول إلى أدوات الإدارة.", "error");
      return;
    }

    workspace.hidden = false;
    setStatus("تم التحقق من صلاحيات الإدارة.", "success");
    await loadSubjects();
  } catch (error) {
    console.error("Admin authorization check failed:", error);
    setStatus(
      "تعذر التحقق من صلاحيات الإدارة. راجع قاعدة Firestore للسماح للمدير بقراءة مستنده فقط.",
      "error"
    );
  }
});

logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  try {
    await signOut(auth);
    window.location.replace("login.html");
  } catch (error) {
    console.error("Admin logout failed:", error);
    logoutButton.disabled = false;
    setStatus("تعذر تسجيل الخروج. حاول مرة أخرى.", "error");
  }
});
