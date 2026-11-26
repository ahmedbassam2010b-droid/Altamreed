import {auth,db} from "./config.js";
import {onAuthStateChanged,signOut} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {collection,addDoc,getDocs,doc,getDoc,setDoc,deleteDoc,serverTimestamp,updateDoc,runTransaction,query,where} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
import {getExamXp} from "./gamification.js";
const $=s=>document.querySelector(s),el=(t,c,x)=>{const n=document.createElement(t);if(c)n.className=c;if(x!==undefined)n.textContent=x;return n;},status=$("#adminStatus"),workspace=$("#adminWorkspace");
function report(t,state="info"){status.textContent=t;status.dataset.state=state;}function val(id){return $("#"+id)?.value?.trim()||"";}function checked(id){return !!$("#"+id)?.checked;}function failed(e){console.error(e);report("تعذر تنفيذ العملية. راجع صلاحيات Firestore. "+(e.code||""),"error");}
async function allowed(u){const s=await getDoc(doc(db,"admins",u.uid));return s.exists()&&s.data().active!==false;}
let gradesCache=[],editingLessonId=null;
function addQuestion(){const w=el("fieldset","question-editor");w.innerHTML='<legend>سؤال</legend><label>نص السؤال<textarea class="q-text" required maxlength="1000"></textarea></label><div class="q-choices"></div><label>الإجابة الصحيحة<select class="q-correct"><option value="0">الأول</option><option value="1">الثاني</option><option value="2">الثالث</option><option value="3">الرابع</option></select></label><label>الدرجة<input class="q-points" type="number" min="1" value="1"></label><button type="button" class="btn btn-danger">حذف السؤال</button>';const box=w.querySelector(".q-choices");for(let i=0;i<4;i++){const l=el("label","","الاختيار "+(i+1)),inp=el("input");inp.className="q-choice";inp.required=true;l.append(inp);box.append(l);}w.querySelector("button").onclick=()=>w.remove();$("#questionsContainer").append(w);}

function addLessonBlock(type,initial={}){
 const wrap=el("fieldset","lesson-block-editor");wrap.dataset.blockType=type;
 const labels={paragraph:"فقرة نصية",heading:"عنوان رئيسي",subheading:"عنوان فرعي",image:"صورة تعليمية",keypoint:"نقطة مهمة",warning:"تنبيه",list:"قائمة نقطية",table:"جدول مقارنة",divider:"فاصل"};
 wrap.append(el("legend","",labels[type]||"وحدة محتوى"));
 const addField=(label,tag,key,placeholder="",value="")=>{const l=el("label","",label),input=el(tag==="textarea"?"textarea":"input");if(tag!=="textarea")input.type=tag;input.dataset.field=key;input.placeholder=placeholder;input.value=value||"";l.append(input);wrap.append(l);};
 if(["heading","subheading","paragraph"].includes(type))addField("النص","textarea","text","اكتب محتوى هذا الجزء...",initial.text);
 if(type==="image"){addField("رابط الصورة (HTTPS)","url","url","https://",initial.url);addField("النص البديل","text","alt","وصف الصورة لقارئ الشاشة",initial.alt);addField("تعليق الصورة","text","caption","شرح مختصر للصورة",initial.caption);}
 if(["keypoint","warning"].includes(type)){addField("العنوان","text","title","عنوان توضيحي",initial.title);addField("التفاصيل","textarea","text","اكتب المعلومة بوضوح...",initial.text);}
 if(type==="list")addField("العناصر (كل عنصر في سطر)","textarea","items","العنصر الأول",(initial.items||[]).join(String.fromCharCode(10)));
 if(type==="table")addField("صفوف الجدول (افصل الأعمدة بعلامة |)","textarea","rows","المفهوم | الوصف",(initial.rows||[]).map(row=>row.join(" | ")).join(String.fromCharCode(10)));
 const remove=el("button","btn btn-danger","حذف الوحدة");remove.type="button";remove.onclick=()=>wrap.remove();wrap.append(remove);$("#lessonBlockEditor").append(wrap);
}
function readLessonBlocks(){
 return [...document.querySelectorAll(".lesson-block-editor")].map(w=>{
  const type=w.dataset.blockType,read=k=>w.querySelector('[data-field="'+k+'"]')?.value?.trim()||"";
  if(["heading","subheading","paragraph"].includes(type))return {type,text:read("text")};
  if(type==="image")return {type,url:read("url"),alt:read("alt"),caption:read("caption")};
  if(type==="keypoint"||type==="warning")return {type,title:read("title"),text:read("text")};
  if(type==="list")return {type,items:read("items").split(String.fromCharCode(10)).map(x=>x.trim()).filter(Boolean)};
  if(type==="table")return {type,rows:read("rows").split(String.fromCharCode(10)).map(line=>line.split("|").map(x=>x.trim())).filter(row=>row.some(Boolean))};
  return {type:"divider"};
 }).filter(b=>b.type==="divider"||(b.type==="image"?b.url:b.type==="list"?b.items.length:b.type==="table"?b.rows.length:b.text));
}
async function commitReview({uid,sourceType,sourceId,amount,reason,percentage,mutate}){const profileRef=doc(db,"publicProfiles",uid),txId=(sourceType+"_"+sourceId).replace(/[\\/#?]/g,"_"),txRef=doc(db,"xpTransactions",txId);await runTransaction(db,async transaction=>{const [profileSnap,txSnap]=await Promise.all([transaction.get(profileRef),transaction.get(txRef)]);if(txSnap.exists())throw new Error("XP_ALREADY_AWARDED");if(amount>0&&!profileSnap.exists())throw new Error("PUBLIC_PROFILE_MISSING");if(mutate)mutate(transaction);if(amount>0){transaction.set(txRef,{uid,amount,sourceType,sourceId,reason,percentage:percentage??null,createdAt:serverTimestamp()});transaction.update(profileRef,{xp:(Number(profileSnap.data().xp)||0)+amount,updatedAt:serverTimestamp()});}});}
async function gradeAttempt(id,data){try{const [examSnap,keySnap]=await Promise.all([getDoc(doc(db,"exams",data.examId)),getDoc(doc(db,"examAnswerKeys",data.examId))]);if(!examSnap.exists()||!keySnap.exists())return report("تعذر العثور على الاختبار أو مفتاح إجابته.","error");const qs=examSnap.data().questions||[],keys=keySnap.data().correctIndexes||[],review=qs.map((q,i)=>{const correctIndex=Number(keys[i]),selected=Number(data.answers?.[i]),points=Number(q.points)||1;return {question:q.text,selected,correctIndex,correct:selected===correctIndex,points};});const score=review.reduce((n,q)=>n+(q.correct?q.points:0),0),maxScore=review.reduce((n,q)=>n+q.points,0),percentage=maxScore?Math.round(score/maxScore*100):0,amount=getExamXp(percentage);await commitReview({uid:data.uid,sourceType:"exam",sourceId:id,amount,reason:"مكافأة نتيجة اختبار: "+(data.examTitle||examSnap.data().title||"اختبار"),percentage,mutate:transaction=>{transaction.set(doc(db,"examResults",id),{uid:data.uid,examId:data.examId,examTitle:data.examTitle||examSnap.data().title||"اختبار",score,maxScore,percentage,createdAt:serverTimestamp()});transaction.update(doc(db,"examAttempts",id),{status:"reviewed",score,maxScore,percentage,xpAwarded:amount,reviewedAt:serverTimestamp()});}});report("تم اعتماد النتيجة"+(amount?" وصرف "+amount+" XP":"؛ لا توجد مكافأة لهذه النسبة")+".","success");await refresh();}catch(e){if(e.message==="XP_ALREADY_AWARDED")report("تم صرف مكافأة هذه المحاولة بالفعل؛ لم يتم تكرارها.","error");else failed(e);}}
async function reviewChallengeResponse(id,data){try{const keySnap=await getDoc(doc(db,"challengeAnswerKeys",data.challengeId));if(!keySnap.exists())return report("مفتاح إجابة التحدي غير موجود.","error");const correct=Number(data.selectedIndex)===Number(keySnap.data().correctIndex),amount=correct?10:0;await commitReview({uid:data.uid,sourceType:"challenge",sourceId:id,amount,reason:"إجابة صحيحة في التحدي اليومي",mutate:transaction=>transaction.update(doc(db,"challengeResponses",id),{status:"reviewed",isCorrect:correct,xpAwarded:amount,reviewedAt:serverTimestamp()})});report(correct?"إجابة صحيحة؛ تم اعتماد 10 XP.":"تمت مراجعة الإجابة؛ لا توجد نقاط لهذه المحاولة.","success");await refresh();}catch(e){if(e.message==="XP_ALREADY_AWARDED")report("سبق اعتماد مكافأة هذا التحدي.","error");else failed(e);}}
async function reviewTaskSubmission(id,data,approve){try{if(!approve){await updateDoc(doc(db,"gamificationSubmissions",id),{status:"rejected",reviewedAt:serverTimestamp()});report("تم رفض طلب إنجاز المهمة.","success");await refresh();return;}const taskSnap=await getDoc(doc(db,"gamificationTasks",data.taskId));if(!taskSnap.exists())return report("المهمة الأصلية غير موجودة.","error");const task=taskSnap.data(),amount=Math.max(0,Math.min(100,Number(task.rewardXp)||0));if(!amount)return report("قيمة مكافأة المهمة غير صحيحة.","error");await commitReview({uid:data.uid,sourceType:"task",sourceId:id,amount,reason:"إتمام مهمة تعليمية: "+(task.title||"مهمة"),mutate:transaction=>transaction.update(doc(db,"gamificationSubmissions",id),{status:"approved",xpAwarded:amount,reviewedAt:serverTimestamp()})});report("تم اعتماد المهمة وصرف "+amount+" XP.","success");await refresh();}catch(e){if(e.message==="XP_ALREADY_AWARDED")report("سبق صرف مكافأة هذه المهمة.","error");else failed(e);}}
async function reviewSimulationSubmission(id,data,approve){
 try{
  if(data.status!=="pending")return report("تمت مراجعة هذا الطلب بالفعل.","error");
  if(!approve){await updateDoc(doc(db,"simulationSubmissions",id),{status:"rejected",xpAwarded:0,reviewedAt:serverTimestamp()});report("تم رفض طلب المحاكاة.","success");await refresh();return;}
  const raw=prompt("حدد مكافأة XP بعد مراجعة الأداء (من 0 إلى 100):","20");
  if(raw===null)return;
  const amount=Number(raw);
  if(!Number.isInteger(amount)||amount<0||amount>100)return report("أدخل رقمًا صحيحًا من 0 إلى 100 XP.","error");
  const sourceId="hand-hygiene-lesson-03_"+data.uid;
  await commitReview({uid:data.uid,sourceType:"simulation",sourceId,amount,reason:"إتمام محاكاة Hand Hygiene — Fundamentals Lesson 03",mutate:transaction=>transaction.update(doc(db,"simulationSubmissions",id),{status:"approved",xpAwarded:amount,reviewedAt:serverTimestamp()})});
  report(amount?"تم اعتماد المحاكاة وصرف "+amount+" XP.":"تم اعتماد المحاكاة دون مكافأة XP.","success");
  await refresh();
 }catch(e){if(e.message==="XP_ALREADY_AWARDED")report("سبق صرف مكافأة هذه المحاكاة لهذا الطالب؛ لم يتم تكرارها.","error");else failed(e);}
}
async function listing(name,target,label){const box=$(target);if(!box)return;box.replaceChildren();const s=await getDocs(collection(db,name));if(s.empty){box.append(el("p","muted","لا توجد عناصر."));return;}s.docs.forEach(d=>{const data=d.data(),r=el("article","admin-item");r.append(el("strong","",label(data)),el("small","",d.id));const detail=data.body||data.content||data.question||data.description;if(detail)r.append(el("p","muted",String(detail).slice(0,220)));if(Array.isArray(data.answers))r.append(el("p","muted","إجابات الطالب (ترقيم الاختيار يبدأ من 1): "+data.answers.map(x=>Number(x)+1).join("، ")));if(name==="challengeResponses"&&Number.isInteger(data.selectedIndex))r.append(el("p","muted","اختيار الطالب: "+(data.selectedIndex+1)));if(["subjects","lessons","exams","library","revisionCards","dailyChallenges","simulations"].includes(name)&&!data.gradeId){const gradeSelect=el("select");gradeSelect.add(new Option("تحديد الصف",""));gradesCache.filter(g=>g.active!==false).forEach(g=>gradeSelect.add(new Option(g.name,g.id)));const assign=el("button","btn btn-secondary","ربط بالصف");assign.onclick=async()=>{if(!gradeSelect.value)return report("اختر الصف أولًا.","error");try{await updateDoc(doc(db,name,d.id),{gradeId:gradeSelect.value,updatedAt:serverTimestamp()});report("تم ربط المحتوى بالصف.","success");await refresh();}catch(e){failed(e);}};r.append(gradeSelect,assign);}if(typeof data.published==="boolean"){const t=el("button","btn btn-secondary",data.published?"إلغاء النشر":"نشر");t.onclick=async()=>{try{const patch={published:!data.published,updatedAt:serverTimestamp()};if(name==="dailyChallenges")patch.publishedAt=!data.published?serverTimestamp():null;await updateDoc(doc(db,name,d.id),patch);report("تم تحديث حالة النشر.","success");await refresh();}catch(e){failed(e);}};r.append(t);}if(name==="users"){
 const state=el("p","muted",data.status==="suspended"?"حالة الحساب: موقوف": "حالة الحساب: نشط");
 r.append(state);
 const hide=el("button","btn btn-secondary","...");
 hide.textContent="جارٍ تحميل حالة الظهور";
 const suspend=el("button","btn btn-danger",data.status==="suspended"?"إعادة تفعيل الحساب":"إيقاف حساب الطالب");
 Promise.resolve().then(async()=>{
  try{
   const profileSnap=await getDoc(doc(db,"publicProfiles",d.id));
   const hidden=profileSnap.exists()&&profileSnap.data().leaderboardHidden===true;
   hide.textContent=hidden?"إظهار في المتصدرين":"إخفاء من المتصدرين";
   hide.onclick=async()=>{
    try{
     if(profileSnap.exists())await updateDoc(doc(db,"publicProfiles",d.id),{leaderboardHidden:!hidden,updatedAt:serverTimestamp()});
     else await setDoc(doc(db,"publicProfiles",d.id),{displayName:data.displayName||"طالب",xp:0,leaderboardHidden:true,updatedAt:serverTimestamp()});
     report(hidden?"تم إظهار الطالب في لوحة المتصدرين.":"تم إخفاء الطالب من لوحة المتصدرين.","success");await refresh();
    }catch(e){failed(e);}
   };
  }catch(e){hide.textContent="تعذر تحميل حالة المتصدرين";failed(e);}
 });
 suspend.onclick=async()=>{
  const stopping=data.status!=="suspended";
  if(!confirm(stopping?"سيتم منع الطالب من دخول المنصة وإخفاؤه من المتصدرين. هل تريد المتابعة؟":"سيتم إعادة تفعيل حساب الطالب. هل تريد المتابعة؟"))return;
  try{
   const reason=stopping?(prompt("سبب إيقاف الحساب (اختياري):","")||"قرار إداري"):"";
   await updateDoc(doc(db,"users",d.id),{status:stopping?"suspended":"active",suspensionReason:stopping?reason:"",statusChangedAt:serverTimestamp(),updatedAt:serverTimestamp()});
   if(stopping){
    const profileRef=doc(db,"publicProfiles",d.id),profileSnap=await getDoc(profileRef);
    if(profileSnap.exists())await updateDoc(profileRef,{leaderboardHidden:true,updatedAt:serverTimestamp()});
    else await setDoc(profileRef,{displayName:data.displayName||"طالب",xp:0,leaderboardHidden:true,updatedAt:serverTimestamp()});
   }
   report(stopping?"تم إيقاف حساب الطالب وإخفاؤه من المتصدرين.":"تمت إعادة تفعيل حساب الطالب. ويمكن إظهاره في المتصدرين من الزر الآخر.","success");await refresh();
  }catch(e){failed(e);}
 };
 r.append(hide,suspend);
}
if(name==="examAttempts"&&data.status==="pending"){const g=el("button","btn btn-primary","مراجعة وتصحيح");g.onclick=()=>gradeAttempt(d.id,data);r.append(g);}if(name==="simulationSubmissions"&&data.status==="pending"){const approve=el("button","btn btn-primary","مراجعة واعتماد XP");approve.onclick=()=>reviewSimulationSubmission(d.id,data,true);const reject=el("button","btn btn-danger","رفض الطلب");reject.onclick=()=>reviewSimulationSubmission(d.id,data,false);r.append(el("p","muted","النتيجة: "+data.score+"% — الخطوات: "+data.completedSteps+"/"+data.totalSteps+" — الزمن: "+data.elapsedSeconds+" ثانية"));if(Array.isArray(data.mistakes)&&data.mistakes.length)r.append(el("p","muted","ملاحظات المحاولة: "+data.mistakes.map(x=>x.message).join("؛ ")));r.append(approve,reject);}if(name==="simulationSubmissions"&&data.status!=="pending")r.append(el("small","",data.status==="approved"?"تم الاعتماد — "+(data.xpAwarded||0)+" XP":"تم الرفض"));if(name==="gamificationSubmissions"&&data.status==="pending"){const approve=el("button","btn btn-primary","اعتماد وصرف المكافأة");approve.onclick=()=>reviewTaskSubmission(d.id,data,true);const reject=el("button","btn btn-danger","رفض الطلب");reject.onclick=()=>reviewTaskSubmission(d.id,data,false);r.append(approve,reject);}if(name==="gamificationSubmissions"&&data.status!=="pending")r.append(el("small","",data.status==="approved"?"تم الاعتماد — "+(data.xpAwarded||0)+" XP":"مرفوض"));if(name==="challengeResponses"&&data.status==="pending"){const g=el("button","btn btn-primary","مراجعة واعتماد");g.onclick=()=>reviewChallengeResponse(d.id,data);r.append(g);}if(name==="examAttempts"&&(data.status==="graded"||data.status==="reviewed"))r.append(el("small","", "النتيجة: "+(data.score||0)+"/"+(data.maxScore||0)+" • "+(data.xpAwarded||0)+" XP"));if(name==="examAttempts"&&data.status==="reviewed"&&Number(data.xpAwarded)>0)r.append(el("small","", "المكافأة: "+data.xpAwarded+" XP"));if(name==="challengeResponses"&&(data.status==="graded"||data.status==="reviewed"))r.append(el("small","",data.isCorrect?"إجابة صحيحة — "+(data.xpAwarded||0)+" XP":"إجابة غير صحيحة — 0 XP"));if(["subjects","chapters","lessons","users"].includes(name)){const edit=el("button","btn btn-secondary",name==="users"?"تعديل بيانات الطالب":"تعديل");edit.onclick=async()=>{try{if(name==="subjects"){const title=prompt("اسم المادة:",data.title||"");if(title===null)return;const description=prompt("وصف المادة:",data.description||"");if(description===null)return;const term=prompt("الفصل الدراسي:",data.term||"");if(term===null)return;const gradeId=prompt("معرّف الصف الدراسي:",data.gradeId||"");if(gradeId===null)return;if(!gradesCache.some(g=>g.id===gradeId&&g.active!==false))return report("معرّف الصف غير صحيح أو غير نشط.","error");await updateDoc(doc(db,name,d.id),{title:title.trim(),description:description.trim(),term:term.trim(),gradeId,year:gradesCache.find(g=>g.id===gradeId).name,grade:gradesCache.find(g=>g.id===gradeId).name,updatedAt:serverTimestamp()});}
else if(name==="chapters"){const title=prompt("اسم الفصل:",data.title||"");if(title===null)return;const description=prompt("وصف الفصل:",data.description||"");if(description===null)return;const order=Number(prompt("ترتيب الفصل:",String(data.order||1)));if(!Number.isInteger(order)||order<1)return report("الترتيب يجب أن يكون رقمًا صحيحًا موجبًا.","error");await updateDoc(doc(db,name,d.id),{title:title.trim(),description:description.trim(),order,updatedAt:serverTimestamp()});}
else if(name==="lessons"){const title=prompt("عنوان الدرس:",data.title||"");if(title===null)return;const content=prompt("محتوى الدرس:",data.content||"");if(content===null)return;const order=Number(prompt("ترتيب الدرس:",String(data.order||1)));if(!Number.isInteger(order)||order<1)return report("الترتيب يجب أن يكون رقمًا صحيحًا موجبًا.","error");await updateDoc(doc(db,name,d.id),{title:title.trim(),content,order,updatedAt:serverTimestamp()});}
else {const displayName=prompt("اسم الطالب:",data.displayName||"");if(displayName===null)return;const gradeId=prompt("معرّف الصف الدراسي:",data.gradeId||"");if(gradeId===null)return;if(!gradesCache.some(g=>g.id===gradeId&&g.active!==false))return report("معرّف الصف غير صحيح أو غير نشط.","error");const gradeName=gradesCache.find(g=>g.id===gradeId).name;await updateDoc(doc(db,"users",d.id),{displayName:displayName.trim(),gradeId,gradeName,updatedAt:serverTimestamp()});}
report("تم حفظ التعديلات.","success");await refresh();}catch(e){failed(e);}};r.append(edit);}if(name!=="users"&&name!=="xpTransactions"){const b=el("button","btn btn-danger","حذف");b.onclick=async()=>{if(confirm("تأكيد الحذف؟")){try{await deleteDoc(doc(db,name,d.id));r.remove();}catch(e){failed(e);}}};r.append(b);}box.append(r);});}
async function refreshGrades(){const snapshot=await getDocs(collection(db,"grades"));const grades=snapshot.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));gradesCache=grades;const ids=["subjectYear","examGrade","resourceGrade","revisionGrade","challengeGrade","simulationGrade","gamificationTaskGrade"];ids.forEach(id=>{const s=$("#"+id);if(!s)return;s.replaceChildren(new Option("اختر الصف",""));grades.filter(g=>g.active!==false).forEach(g=>s.add(new Option(g.name,g.id)));});const box=$("#gradesList");if(box){box.replaceChildren();if(!grades.length)box.append(el("p","muted","لم تتم إضافة صفوف بعد."));grades.forEach(g=>{const row=el("div","admin-item");row.append(el("strong","",g.name||"صف بدون اسم"));const edit=el("button","btn btn-secondary","تعديل الاسم");edit.onclick=async()=>{const name=prompt("اكتب اسم الصف الجديد:",g.name||"");if(!name||!name.trim())return;try{await updateDoc(doc(db,"grades",g.id),{name:name.trim(),updatedAt:serverTimestamp()});report("تم تعديل الصف.","success");await refresh();}catch(e){failed(e);}};const toggle=el("button","btn btn-secondary",g.active===false?"تفعيل":"إيقاف");toggle.onclick=async()=>{try{await updateDoc(doc(db,"grades",g.id),{active:g.active===false,updatedAt:serverTimestamp()});report("تم تحديث حالة الصف.","success");await refresh();}catch(e){failed(e);}};row.append(edit,toggle);box.append(row);});}return grades;}
async function refresh(){const grades=await refreshGrades();const freshSubjects=await getDocs(collection(db,"subjects"));const freshLessons=await getDocs(collection(db,"lessons"));const editSelect=$("#lessonEditSelect");if(editSelect){const current=editSelect.value;editSelect.replaceChildren(new Option("إنشاء محاضرة جديدة",""));freshLessons.docs.forEach(d=>editSelect.add(new Option(d.data().title||"محاضرة",d.id)));if(current)editSelect.value=current;}const s=freshSubjects,sel=$("#lessonSubject"),chapterSel=$("#chapterSubject"),examSel=$("#examSubject");const curriculumSel=$("#medicalCurriculumSubject");if(curriculumSel){const matches=s.docs.filter(d=>{const x=d.data();return String(x.title||"").trim().toLowerCase()==="internal medicine"&&/second|ثاني|الثاني/i.test([x.year,x.grade,x.gradeName,gradesCache.find(g=>g.id===x.gradeId)?.name].filter(Boolean).join(" "));});curriculumSel.replaceChildren(new Option(matches.length?"Internal Medicine — السنة الثانية":"لم يتم العثور على مادة Internal Medicine للسنة الثانية",""));matches.forEach(d=>curriculumSel.add(new Option("Internal Medicine",d.id)));if(matches.length===1)curriculumSel.value=matches[0].id;else curriculumSel.value="";}const surgerySel=$("#generalSurgeryCurriculumSubject");if(surgerySel){const matches=s.docs.filter(d=>{const x=d.data();return String(x.title||"").trim().toLowerCase()==="general surgery"&&/second|ثاني|الثاني/i.test([x.year,x.grade,x.gradeName,gradesCache.find(g=>g.id===x.gradeId)?.name].filter(Boolean).join(" "));});surgerySel.replaceChildren(new Option(matches.length?"General Surgery — السنة الثانية":"لم يتم العثور على مادة General Surgery للسنة الثانية",""));matches.forEach(d=>surgerySel.add(new Option("General Surgery",d.id)));if(matches.length===1)surgerySel.value=matches[0].id;else surgerySel.value="";}const medSurgSel=$("#medicalSurgicalTheorySubject");if(medSurgSel){const normalizeTitle=v=>String(v||"").toLowerCase().replace(/[^a-z]/g,"");const matches=s.docs.filter(d=>["medicalsurgicalnursing","medicalsurgicalnursingtheoretical"].includes(normalizeTitle(d.data().title))&&/second|ثاني|الثاني/i.test([d.data().year,d.data().grade,d.data().gradeName,gradesCache.find(g=>g.id===d.data().gradeId)?.name].filter(Boolean).join(" ")));medSurgSel.replaceChildren(new Option(matches.length?"Medical Surgical Nursing — السنة الثانية":"لم يتم العثور على مادة Medical Surgical Nursing للسنة الثانية",""));matches.forEach(d=>medSurgSel.add(new Option(d.data().title,d.id)));medSurgSel.value=matches.length===1?matches[0].id:"";}const anatomySel=$("#anatomyCurriculumSubject");if(anatomySel){const normYear=v=>String(v||"").toLowerCase().replace(/[\\u064B-\\u065F\\u0670ـ]/g,"").replace(/[أإآ]/g,"ا");const isFirst=v=>/(first|1st|year\\s*1|grade\\s*1|اول|الاول|الاولى)/i.test(normYear(v));const isOther=v=>/(second|2nd|year\\s*2|grade\\s*2|ثاني|الثاني|الثانيه)/i.test(normYear(v));const named=s.docs.filter(d=>{const x=d.data(),t=String(x.title||"").trim().toLowerCase().replace(/[^a-z]/g,"");return ["anatomy","anatomyandphysiology","anatomyphysiology"].includes(t);});const matches=named.filter(d=>{const x=d.data(),g=[x.year,x.grade,x.gradeName,gradesCache.find(z=>z.id===x.gradeId)?.name].filter(Boolean).join(" ");return isFirst(g)||(!isOther(g)&&named.length===1);});anatomySel.replaceChildren(new Option(matches.length===1?"Anatomy — المادة الموجودة":"اختر مادة Anatomy الموجودة ("+matches.length+")",""));matches.forEach(d=>anatomySel.add(new Option(d.data().title+" — "+(gradesCache.find(z=>z.id===d.data().gradeId)?.name||d.data().year||d.data().grade||"الصف المسجل"),d.id)));anatomySel.value=matches.length===1?matches[0].id:"";}const practiceSel=$("#medicalSurgicalPracticeSubject");if(practiceSel){const matches=s.docs.filter(d=>String(d.data().title||"").trim().toLowerCase()==="medical surgical nursing practice"&&/second|ثاني|الثاني/i.test([d.data().year,d.data().grade,d.data().gradeName,gradesCache.find(g=>g.id===d.data().gradeId)?.name].filter(Boolean).join(" ")));practiceSel.replaceChildren(new Option(matches.length?"Medical surgical nursing practice — السنة الثانية":"لم يتم العثور على المادة المطلوبة",""));matches.forEach(d=>practiceSel.add(new Option(d.data().title,d.id)));practiceSel.value=matches.length===1?matches[0].id:"";}const communitySel=$("#communityHealthCurriculumSubject");if(communitySel){const matches=s.docs.filter(d=>{const x=d.data();return String(x.title||"").trim().toLowerCase()==="community health nursing"&&/second|ثاني|الثاني/i.test([x.year,x.grade,x.gradeName,gradesCache.find(g=>g.id===x.gradeId)?.name].filter(Boolean).join(" "));});communitySel.replaceChildren(new Option(matches.length?"Community Health Nursing — السنة الثانية":"لم يتم العثور على مادة Community Health Nursing للسنة الثانية",""));matches.forEach(d=>communitySel.add(new Option("Community Health Nursing",d.id)));communitySel.value=matches.length===1?matches[0].id:"";}sel.replaceChildren(new Option("اختر المادة",""));if(chapterSel)chapterSel.replaceChildren(new Option("اختر المادة",""));if(examSel)examSel.replaceChildren(new Option("اختبار عام",""));s.docs.forEach(d=>{sel.add(new Option(d.data().title||"مادة",d.id));if(chapterSel)chapterSel.add(new Option(d.data().title||"مادة",d.id));if(examSel)examSel.add(new Option(d.data().title||"مادة",d.id));});await listing("subjects","#subjectsList",d=>d.title||"مادة");await listing("chapters","#chaptersList",d=>d.title||"Chapter");await listing("lessons","#lessonsList",d=>d.title||"درس");await listing("exams","#examsList",d=>d.title||"اختبار");await listing("examAttempts","#examAttemptsList",d=>(d.examTitle||"محاولة اختبار")+" — "+(d.status==="reviewed"?"تمت المراجعة":"قيد المراجعة"));await listing("challengeResponses","#challengeResponsesList",d=>"إجابة تحدٍ — "+(d.status||"قيد المراجعة"));await listing("library","#libraryList",d=>d.title||"مورد");await listing("users","#usersList",d=>(d.displayName||"طالب")+" — "+(d.email||""));await listing("messages","#messagesList",d=>(d.subject||"رسالة")+" — "+(d.email||d.uid||""));await listing("communityPosts","#communityList",d=>d.displayName||"مشاركة");await listing("notifications","#notificationsList",d=>d.title||"إشعار");await listing("revisionCards","#revisionList",d=>d.title||"مراجعة");await listing("dailyChallenges","#challengesList",d=>d.title||"تحدٍ");await listing("simulations","#simulationsList",d=>d.title||"محاكاة");await listing("xpTransactions","#xpTransactionsList",d=>(d.reason||"مكافأة XP")+" — "+(d.amount||0)+" نقطة");await listing("gamificationTasks","#gamificationTasksList",d=>(d.title||"مهمة")+" — "+(d.rewardXp||0)+" XP");await listing("simulationSubmissions","#simulationSubmissionsList",d=>"محاكاة Hand Hygiene — "+(d.status||"قيد المراجعة"));await listing("gamificationSubmissions","#gamificationSubmissionsList",d=>"طلب إنجاز — "+(d.status||"قيد المراجعة"));}

// One-time textbook curriculum importer. It writes through the signed-in admin session.
async function importSecondYearMedicalCurriculum(subjectId,publish){
 let phase="قراءة بيانات المادة";
 try{
  const subjectSnap=await getDoc(doc(db,"subjects",subjectId));
  if(!subjectSnap.exists())throw new Error("SUBJECT_NOT_FOUND");
  const subject=subjectSnap.data();
  if(String(subject.title||"").trim().toLowerCase()!=="internal medicine")throw new Error("WRONG_SUBJECT");
  const gradeName=[subject.year,subject.grade,subject.gradeName,gradesCache.find(g=>g.id===subject.gradeId)?.name].filter(Boolean).join(" ");
  if(!/second|ثاني|الثاني/i.test(gradeName))throw new Error("WRONG_GRADE");
  const gradeId=subject.gradeId||"";
  phase="تحميل ملف المنهج والتحقق منه";
  const response=await fetch("content/second-year/internal-medicine-curriculum.json",{cache:"no-store"});
  if(!response.ok)throw new Error("CURRICULUM_FILE_NOT_FOUND (HTTP "+response.status+")");
  const curriculum=await response.json();
  if(curriculum.contentStatus!=="complete"||curriculum.editorialVerification?.sourcePagesChecked!==94||curriculum.editorialVerification?.placeholdersRemaining!==0)throw new Error("CURRICULUM_NOT_VERIFIED");
  phase="فحص محاولة الاستيراد السابقة";
  const [existingChapters,existingLessons]=await Promise.all([
   getDocs(query(collection(db,"chapters"),where("subjectId","==",subjectId))),
   getDocs(query(collection(db,"lessons"),where("subjectId","==",subjectId)))
  ]);
  const sourceId="internal-medicine-second-year-2016-2020";
  const priorChapters=existingChapters.docs.filter(d=>d.data().sourceCurriculumId===sourceId);
  const priorLessons=existingLessons.docs.filter(d=>d.data().sourceCurriculumId===sourceId);
  const expectedLessons=curriculum.chapters.reduce((n,c)=>n+(c.lessons||[]).length,0);
  const chapterByTitle=new Map(priorChapters.map(d=>[d.data().title,d]));
  const lessonByTitle=new Map(priorLessons.map(d=>[d.data().title,d]));
  const existingSetIsComplete=priorChapters.length===curriculum.chapters.length&&priorLessons.length===expectedLessons&&curriculum.chapters.every(c=>chapterByTitle.has(c.title)&&c.lessons.every(l=>lessonByTitle.has(l.title)));
  let chapterCount=0,lessonCount=0;
  if(existingSetIsComplete){
   phase="تحديث الفصول والمحاضرات الموجودة مع الحفاظ على معرّفاتها وتقدم الطلاب";
   for(const chapter of curriculum.chapters){
    const existingChapter=chapterByTitle.get(chapter.title);
    const chapterData={subjectId,gradeId,sourceCurriculumId:sourceId,title:chapter.title,description:chapter.description||"",order:chapter.order,published:!!publish,updatedAt:serverTimestamp()};
    await updateDoc(doc(db,"chapters",existingChapter.id),chapterData);
    chapterCount++;
    for(const lesson of chapter.lessons){
     const existingLesson=lessonByTitle.get(lesson.title);
     const lessonData={subjectId,gradeId,sourceCurriculumId:sourceId,chapterId:existingChapter.id,title:lesson.title,content:"",contentBlocks:lesson.contentBlocks||[],objectives:lesson.objectives||[],keyTerms:lesson.keyTerms||[],order:lesson.order,published:!!publish,updatedAt:serverTimestamp()};
     await updateDoc(doc(db,"lessons",existingLesson.id),lessonData);
     lessonCount++;
    }
   }
   return {chapterCount,lessonCount,updated:true};
  }
  if(priorChapters.length||priorLessons.length){
   phase="تنظيف محاولة الاستيراد السابقة غير المكتملة";
   for(const item of priorLessons)await deleteDoc(doc(db,"lessons",item.id));
   for(const item of priorChapters)await deleteDoc(doc(db,"chapters",item.id));
  }
  for(const chapter of curriculum.chapters){
   phase="إضافة الفصل: "+chapter.title;
   const chapterData={subjectId,title:chapter.title,description:chapter.description||"",order:chapter.order,published:!!publish,sourceCurriculumId:sourceId,createdAt:serverTimestamp()};
   if(gradeId)chapterData.gradeId=gradeId;
   const ch=await addDoc(collection(db,"chapters"),chapterData);
   chapterCount++;
   for(const lesson of chapter.lessons){
    phase="إضافة المحاضرة: "+lesson.title;
    const lessonData={subjectId,chapterId:ch.id,title:lesson.title,content:"",contentBlocks:lesson.contentBlocks||[],objectives:lesson.objectives||[],keyTerms:lesson.keyTerms||[],order:lesson.order,published:!!publish,sourceCurriculumId:sourceId,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
    if(gradeId)lessonData.gradeId=gradeId;
    await addDoc(collection(db,"lessons"),lessonData);
    lessonCount++;
   }
  }
  return {chapterCount,lessonCount};
 }catch(error){error.importPhase=phase;throw error;}
}
async function importSecondYearGeneralSurgeryCurriculum(subjectId,publish){
 let phase="قراءة بيانات المادة";
 try{
  const subjectSnap=await getDoc(doc(db,"subjects",subjectId));
  if(!subjectSnap.exists())throw new Error("SUBJECT_NOT_FOUND");
  const subject=subjectSnap.data();
  if(String(subject.title||"").trim().toLowerCase()!=="general surgery")throw new Error("WRONG_SUBJECT");
  const linkedGrade=gradesCache.find(g=>g.id===subject.gradeId);
  const gradeName=[subject.year,subject.grade,subject.gradeName,linkedGrade?.name].filter(Boolean).join(" ");
  if(!/second|ثاني|الثاني/i.test(gradeName))throw new Error("WRONG_GRADE");
  const gradeId=subject.gradeId||gradesCache.find(g=>/second|ثاني|الثاني/i.test(g.name||""))?.id||"";
  phase="تحميل ملف المنهج والتحقق منه";
  const response=await fetch("content/second-year/general-surgery-curriculum.json",{cache:"no-store"});
  if(!response.ok)throw new Error("CURRICULUM_FILE_NOT_FOUND (HTTP "+response.status+")");
  const curriculum=await response.json();
  if(curriculum.contentStatus!=="complete"||curriculum.editorialVerification?.sourcePagesChecked!==165||curriculum.editorialVerification?.placeholdersRemaining!==0)throw new Error("CURRICULUM_NOT_VERIFIED");
  phase="فحص محاولة الاستيراد السابقة";
  const [existingChapters,existingLessons]=await Promise.all([
   getDocs(query(collection(db,"chapters"),where("subjectId","==",subjectId))),
   getDocs(query(collection(db,"lessons"),where("subjectId","==",subjectId)))
  ]);
  const sourceId="general-surgery-second-year-textbook";
  const priorChapters=existingChapters.docs.filter(d=>d.data().sourceCurriculumId===sourceId);
  const priorLessons=existingLessons.docs.filter(d=>d.data().sourceCurriculumId===sourceId);
  const expectedLessons=curriculum.chapters.reduce((n,c)=>n+(c.lessons||[]).length,0);
  const chapterByTitle=new Map(priorChapters.map(d=>[d.data().title,d]));
  const lessonByTitle=new Map(priorLessons.map(d=>[d.data().title,d]));
  const existingSetIsComplete=priorChapters.length===curriculum.chapters.length&&priorLessons.length===expectedLessons&&curriculum.chapters.every(c=>chapterByTitle.has(c.title)&&c.lessons.every(l=>lessonByTitle.has(l.title)));
  let chapterCount=0,lessonCount=0;
  if(existingSetIsComplete){
   phase="تحديث الفصول والمحاضرات الموجودة مع الحفاظ على معرّفاتها وتقدم الطلاب";
   for(const chapter of curriculum.chapters){
    const existingChapter=chapterByTitle.get(chapter.title);
    const chapterData={subjectId,sourceCurriculumId:sourceId,title:chapter.title,description:chapter.description||"",order:chapter.order,published:!!publish,updatedAt:serverTimestamp()};
    if(gradeId)chapterData.gradeId=gradeId;
    await updateDoc(doc(db,"chapters",existingChapter.id),chapterData);
    chapterCount++;
    for(const lesson of chapter.lessons){
     const existingLesson=lessonByTitle.get(lesson.title);
     const lessonData={subjectId,sourceCurriculumId:sourceId,chapterId:existingChapter.id,title:lesson.title,content:"",contentBlocks:lesson.contentBlocks||[],objectives:lesson.objectives||[],keyTerms:lesson.keyTerms||[],order:lesson.order,published:!!publish,updatedAt:serverTimestamp()};
     if(gradeId)lessonData.gradeId=gradeId;
     await updateDoc(doc(db,"lessons",existingLesson.id),lessonData);
     lessonCount++;
    }
   }
   return {chapterCount,lessonCount,updated:true};
  }
  if(priorChapters.length||priorLessons.length){
   phase="تنظيف محاولة الاستيراد السابقة غير المكتملة";
   for(const item of priorLessons)await deleteDoc(doc(db,"lessons",item.id));
   for(const item of priorChapters)await deleteDoc(doc(db,"chapters",item.id));
  }
  for(const chapter of curriculum.chapters){
   phase="إضافة الفصل: "+chapter.title;
   const chapterData={subjectId,title:chapter.title,description:chapter.description||"",order:chapter.order,published:!!publish,sourceCurriculumId:sourceId,createdAt:serverTimestamp()};
   if(gradeId)chapterData.gradeId=gradeId;
   const ch=await addDoc(collection(db,"chapters"),chapterData);
   chapterCount++;
   for(const lesson of chapter.lessons){
    phase="إضافة المحاضرة: "+lesson.title;
    const lessonData={subjectId,chapterId:ch.id,title:lesson.title,content:"",contentBlocks:lesson.contentBlocks||[],objectives:lesson.objectives||[],keyTerms:lesson.keyTerms||[],order:lesson.order,published:!!publish,sourceCurriculumId:sourceId,createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
    if(gradeId)lessonData.gradeId=gradeId;
    await addDoc(collection(db,"lessons"),lessonData);
    lessonCount++;
   }
  }
  return {chapterCount,lessonCount};
 }catch(error){error.importPhase=phase;throw error;}
}
$("#medicalCurriculumImportForm")?.addEventListener("submit",async e=>{
 e.preventDefault();const subjectId=val("medicalCurriculumSubject"),publish=checked("medicalCurriculumPublish");
 if(!subjectId)return report("اختر مادة السنة الثانية أولًا.","error");
 const button=e.submitter; if(button)button.disabled=true;
 try{const result=await importSecondYearMedicalCurriculum(subjectId,publish);report((result.updated?"تم تحديث محتوى ":"تم استيراد ")+result.chapterCount+" فصلًا و"+result.lessonCount+" محاضرة. "+(publish?"المحتوى منشور للطلاب بعد تحديث الصفحة.":"المحتوى محفوظ كمسودة."),"success");await refresh();}
 catch(error){const messages={SUBJECT_NOT_FOUND:"المادة غير موجودة.",WRONG_SUBJECT:"اختر مادة Internal Medicine فقط.",WRONG_GRADE:"المادة المختارة لا تبدو مادة السنة الثانية. اختر مادة السنة الثانية.",ALREADY_IMPORTED:"سبق استيراد هذا المنهج لهذه المادة؛ لم تتم إضافة نسخة مكررة.",CURRICULUM_FILE_NOT_FOUND:"ملف المنهج غير موجود في إصدار الموقع الحالي.",CURRICULUM_NOT_VERIFIED:"لم يُسمح بالاستيراد: محتوى الكتاب لم يجتز مراجعة الاكتمال."};const detail=[error.code||"no-code",error.message||String(error)].join(" — ");report((messages[error.message]||"تعذر الاستيراد")+" | المرحلة: "+(error.importPhase||"غير محددة")+" | "+detail,"error");console.error("Curriculum import failed",error); }
 finally{if(button)button.disabled=false;}
});
$("#generalSurgeryCurriculumImportForm")?.addEventListener("submit",async e=>{
 e.preventDefault();const subjectId=val("generalSurgeryCurriculumSubject"),publish=checked("generalSurgeryCurriculumPublish");
 if(!subjectId)return report("اختر مادة السنة الثانية أولًا.","error");
 const button=e.submitter; if(button)button.disabled=true;
 try{const result=await importSecondYearGeneralSurgeryCurriculum(subjectId,publish);report((result.updated?"تم تحديث محتوى ":"تم استيراد ")+result.chapterCount+" فصلًا و"+result.lessonCount+" محاضرة. "+(publish?"المحتوى منشور للطلاب بعد تحديث الصفحة.":"المحتوى محفوظ كمسودة."),"success");await refresh();}
 catch(error){const messages={SUBJECT_NOT_FOUND:"المادة غير موجودة.",WRONG_SUBJECT:"اختر مادة General Surgery فقط.",WRONG_GRADE:"المادة المختارة لا تبدو مادة السنة الثانية. اختر مادة السنة الثانية.",ALREADY_IMPORTED:"سبق استيراد هذا المنهج لهذه المادة؛ لم تتم إضافة نسخة مكررة.",CURRICULUM_FILE_NOT_FOUND:"ملف المنهج غير موجود في إصدار الموقع الحالي.",CURRICULUM_NOT_VERIFIED:"لم يُسمح بالاستيراد: محتوى الكتاب لم يجتز مراجعة الاكتمال."};const detail=[error.code||"no-code",error.message||String(error)].join(" — ");report((messages[error.message]||"تعذر الاستيراد")+" | المرحلة: "+(error.importPhase||"غير محددة")+" | "+detail,"error");console.error("Curriculum import failed",error); }
 finally{if(button)button.disabled=false;}
});


async function importSecondYearCommunityHealthCurriculum(subjectId,publish){
 let phase="قراءة بيانات المادة";
 try{
  const subjectSnap=await getDoc(doc(db,"subjects",subjectId));
  if(!subjectSnap.exists())throw new Error("SUBJECT_NOT_FOUND");
  const subject=subjectSnap.data();
  if(String(subject.title||"").trim().toLowerCase()!=="community health nursing")throw new Error("WRONG_SUBJECT");
  const gradeName=[subject.year,subject.grade,subject.gradeName,gradesCache.find(g=>g.id===subject.gradeId)?.name].filter(Boolean).join(" ");
  if(!/second|ثاني|الثاني/i.test(gradeName))throw new Error("WRONG_GRADE");
  const gradeId=subject.gradeId||"";
  phase="تحميل ملف المنهج والتحقق منه";
  const response=await fetch("content/second-year/community-health-nursing-curriculum.json",{cache:"no-store"});
  if(!response.ok)throw new Error("CURRICULUM_FILE_NOT_FOUND (HTTP "+response.status+")");
  const curriculum=await response.json();
  if(curriculum.contentStatus!=="complete"||curriculum.editorialVerification?.sourcePagesChecked!==89||curriculum.editorialVerification?.placeholdersRemaining!==0||curriculum.editorialVerification?.chapterCount!==5||curriculum.editorialVerification?.lessonCount!==15)throw new Error("CURRICULUM_NOT_VERIFIED");
  phase="فحص محاولة الاستيراد السابقة";
  const [existingChapters,existingLessons]=await Promise.all([
   getDocs(query(collection(db,"chapters"),where("subjectId","==",subjectId))),
   getDocs(query(collection(db,"lessons"),where("subjectId","==",subjectId)))
  ]);
  const sourceId="community-health-nursing-second-year-textbook";
  const priorChapters=existingChapters.docs.filter(d=>d.data().sourceCurriculumId===sourceId);
  const priorLessons=existingLessons.docs.filter(d=>d.data().sourceCurriculumId===sourceId);
  const expectedLessons=curriculum.chapters.reduce((n,c)=>n+(c.lessons||[]).length,0);
  const chapterByTitle=new Map(priorChapters.map(d=>[d.data().title,d]));
  const lessonByTitle=new Map(priorLessons.map(d=>[d.data().title,d]));
  const complete=priorChapters.length===curriculum.chapters.length&&priorLessons.length===expectedLessons&&curriculum.chapters.every(c=>chapterByTitle.has(c.title)&&c.lessons.every(l=>lessonByTitle.has(l.title)));
  let chapterCount=0,lessonCount=0;
  if(complete){
   phase="تحديث المحتوى الموجود مع الحفاظ على معرّفات الفصول والمحاضرات";
   for(const chapter of curriculum.chapters){
    const oldChapter=chapterByTitle.get(chapter.title);
    await updateDoc(doc(db,"chapters",oldChapter.id),{subjectId,gradeId,sourceCurriculumId:sourceId,title:chapter.title,description:chapter.description||"",order:chapter.order,published:!!publish,updatedAt:serverTimestamp()});
    chapterCount++;
    for(const lesson of chapter.lessons){
     const oldLesson=lessonByTitle.get(lesson.title);
     await updateDoc(doc(db,"lessons",oldLesson.id),{subjectId,gradeId,sourceCurriculumId:sourceId,chapterId:oldChapter.id,title:lesson.title,content:"",contentBlocks:lesson.contentBlocks||[],objectives:lesson.objectives||[],keyTerms:lesson.keyTerms||[],order:lesson.order,published:!!publish,updatedAt:serverTimestamp()});
     lessonCount++;
    }
   }
   return {chapterCount,lessonCount,updated:true};
  }
  if(priorChapters.length||priorLessons.length){
   phase="تنظيف محاولة استيراد سابقة غير مكتملة";
   for(const item of priorLessons)await deleteDoc(doc(db,"lessons",item.id));
   for(const item of priorChapters)await deleteDoc(doc(db,"chapters",item.id));
  }
  for(const chapter of curriculum.chapters){
   phase="إضافة الفصل: "+chapter.title;
   const ch=await addDoc(collection(db,"chapters"),{subjectId,gradeId,sourceCurriculumId:sourceId,title:chapter.title,description:chapter.description||"",order:chapter.order,published:!!publish,createdAt:serverTimestamp()});
   chapterCount++;
   for(const lesson of chapter.lessons){
    phase="إضافة المحاضرة: "+lesson.title;
    await addDoc(collection(db,"lessons"),{subjectId,gradeId,sourceCurriculumId:sourceId,chapterId:ch.id,title:lesson.title,content:"",contentBlocks:lesson.contentBlocks||[],objectives:lesson.objectives||[],keyTerms:lesson.keyTerms||[],order:lesson.order,published:!!publish,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    lessonCount++;
   }
  }
  return {chapterCount,lessonCount};
 }catch(error){error.importPhase=phase;throw error;}
}
$("#communityHealthCurriculumImportForm")?.addEventListener("submit",async e=>{
 e.preventDefault();
 const subjectId=val("communityHealthCurriculumSubject"),publish=checked("communityHealthCurriculumPublish");
 if(!subjectId)return report("اختر مادة Community Health Nursing للسنة الثانية أولًا.","error");
 const button=e.submitter;if(button)button.disabled=true;
 try{
  const result=await importSecondYearCommunityHealthCurriculum(subjectId,publish);
  report((result.updated?"تم تحديث محتوى ":"تم استيراد ")+result.chapterCount+" فصلًا و"+result.lessonCount+" محاضرة. "+(publish?"المحتوى منشور للطلاب بعد تحديث الصفحة.":"المحتوى محفوظ كمسودة."),"success");
  await refresh();
 }catch(error){
  const messages={SUBJECT_NOT_FOUND:"المادة غير موجودة.",WRONG_SUBJECT:"اختر Community Health Nursing فقط.",WRONG_GRADE:"المادة المختارة ليست للصف الثاني الثانوي التمريض.",CURRICULUM_FILE_NOT_FOUND:"ملف المنهج غير موجود.",CURRICULUM_NOT_VERIFIED:"لم يجتز ملف المنهج فحص الاكتمال."};
  report((messages[error.message]||"تعذر الاستيراد")+" | المرحلة: "+(error.importPhase||"غير محددة")+" | "+(error.code||"no-code")+" — "+(error.message||String(error)),"error");
  console.error("Community Health Nursing import failed",error);
 }finally{if(button)button.disabled=false;}
});

async function importMedicalSurgicalTheory(subjectId,publish){
 let phase="التحقق من المادة";
 try{
  const s=await getDoc(doc(db,"subjects",subjectId));if(!s.exists())throw new Error("SUBJECT_NOT_FOUND");
  const d=s.data();const normalizeTitle=v=>String(v||"").toLowerCase().replace(/[^a-z]/g,"");if(!["medicalsurgicalnursing","medicalsurgicalnursingtheoretical"].includes(normalizeTitle(d.title)))throw new Error("WRONG_SUBJECT");
  const gradeName=[d.year,d.grade,d.gradeName,gradesCache.find(g=>g.id===d.gradeId)?.name].filter(Boolean).join(" ");
  if(!/second|ثاني|الثاني/i.test(gradeName))throw new Error("WRONG_GRADE");
  phase="تحميل ملف المنهج";
  const response=await fetch("content/second-year/medical-surgical-nursing-curriculum.json",{cache:"no-store"});if(!response.ok)throw new Error("CURRICULUM_FILE_NOT_FOUND");
  const curriculum=await response.json();if(curriculum.chapters?.length!==11||curriculum.contentStatus!=="in-progress")throw new Error("CURRICULUM_INVALID");
  const sourceId="medical-surgical-nursing-theory-second-year";
  phase="فحص المحتوى الموجود";
  const [cs,ls]=await Promise.all([getDocs(query(collection(db,"chapters"),where("subjectId","==",subjectId))),getDocs(query(collection(db,"lessons"),where("subjectId","==",subjectId)))]);
  const oldC=cs.docs.filter(x=>x.data().sourceCurriculumId===sourceId),oldL=ls.docs.filter(x=>x.data().sourceCurriculumId===sourceId);
  const cMap=new Map(oldC.map(x=>[x.data().title,x])),lMap=new Map(oldL.map(x=>[x.data().title,x]));
  const expected=curriculum.chapters.reduce((n,c)=>n+c.lessons.length,0);
  const isComplete=oldC.length===11&&oldL.length===expected&&curriculum.chapters.every(c=>cMap.has(c.title)&&c.lessons.every(l=>lMap.has(l.title)));
  let chapterCount=0,lessonCount=0;
  if(!isComplete&&(oldC.length||oldL.length)){
   phase="تنظيف استيراد سابق غير مكتمل";
   for(const x of oldL)await deleteDoc(doc(db,"lessons",x.id));
   for(const x of oldC)await deleteDoc(doc(db,"chapters",x.id));
  }
  for(const ch of curriculum.chapters){
   phase="حفظ الفصل: "+ch.title;
   let chId;
   if(isComplete){chId=cMap.get(ch.title).id;await updateDoc(doc(db,"chapters",chId),{description:ch.description,order:ch.order,published:!!publish,updatedAt:serverTimestamp()});}
   else {const ref=await addDoc(collection(db,"chapters"),{subjectId,gradeId:d.gradeId,sourceCurriculumId:sourceId,title:ch.title,description:ch.description,order:ch.order,published:!!publish,createdAt:serverTimestamp()});chId=ref.id;}
   chapterCount++;
   for(const lesson of ch.lessons){
    phase="حفظ المحاضرة: "+lesson.title;
    const payload={subjectId,gradeId:d.gradeId,sourceCurriculumId:sourceId,chapterId:chId,title:lesson.title,content:"",contentBlocks:lesson.contentBlocks||[],objectives:lesson.objectives||[],keyTerms:lesson.keyTerms||[],order:lesson.order,published:!!publish,updatedAt:serverTimestamp()};
    if(isComplete)await updateDoc(doc(db,"lessons",lMap.get(lesson.title).id),payload);
    else await addDoc(collection(db,"lessons"),{...payload,createdAt:serverTimestamp()});
    lessonCount++;
   }
  }
  return {chapterCount,lessonCount,updated:isComplete};
 }catch(e){e.importPhase=phase;throw e;}
}
$("#medicalSurgicalTheoryImportForm")?.addEventListener("submit",async e=>{
 e.preventDefault();const subjectId=val("medicalSurgicalTheorySubject"),publish=checked("medicalSurgicalTheoryPublish");if(!subjectId)return report("اختر مادة التمريض الباطني الجراحي للسنة الثانية.","error");
 const b=e.submitter;if(b)b.disabled=true;
 try{const r=await importMedicalSurgicalTheory(subjectId,publish);report((r.updated?"تم تحديث ":"تم استيراد ")+r.chapterCount+" فصلًا و"+r.lessonCount+" محاضرة. "+(publish?"المحتوى منشور بعد تحديث الصفحة.":"المحتوى محفوظ كمسودة."),"success");await refresh();}
 catch(e){report("تعذر الاستيراد | المرحلة: "+(e.importPhase||"غير محددة")+" | "+(e.code||"no-code")+" — "+(e.message||String(e)),"error");}
 finally{if(b)b.disabled=false;}
});

async function importMedicalSurgicalPracticePilot(subjectId,publish){
 let phase="التحقق من المادة";
 try{
  const subjectSnap=await getDoc(doc(db,"subjects",subjectId));if(!subjectSnap.exists())throw new Error("SUBJECT_NOT_FOUND");
  const subject=subjectSnap.data();
  if(String(subject.title||"").trim().toLowerCase()!=="medical surgical nursing practice")throw new Error("WRONG_SUBJECT");
  const gradeName=[subject.year,subject.grade,subject.gradeName,gradesCache.find(g=>g.id===subject.gradeId)?.name].filter(Boolean).join(" ");
  if(!/second|ثاني|الثاني/i.test(gradeName))throw new Error("WRONG_GRADE");
  phase="تحميل ملف الإجراء";
  const response=await fetch("content/second-year/medical-surgical-nursing-practice-curriculum.json",{cache:"no-store"});
  if(!response.ok)throw new Error("CURRICULUM_FILE_NOT_FOUND");
  const curriculum=await response.json();
  if(curriculum.contentStatus!=="pilot"||!Array.isArray(curriculum.chapters)||curriculum.chapters.length!==1)throw new Error("CURRICULUM_INVALID");
  const sourceId=curriculum.sourceId;
  phase="فحص المحتوى السابق";
  const [cs,ls]=await Promise.all([getDocs(query(collection(db,"chapters"),where("subjectId","==",subjectId))),getDocs(query(collection(db,"lessons"),where("subjectId","==",subjectId)))]);
  const oldC=cs.docs.find(x=>x.data().sourceCurriculumId===sourceId),oldL=ls.docs.find(x=>x.data().sourceCurriculumId===sourceId);
  let chapterId,updated=!!(oldC&&oldL);
  const ch=curriculum.chapters[0];
  if(oldC){chapterId=oldC.id;await updateDoc(doc(db,"chapters",chapterId),{title:ch.title,description:ch.description||"",order:ch.order,published:!!publish,updatedAt:serverTimestamp()});}
  else {const ref=await addDoc(collection(db,"chapters"),{subjectId,gradeId:subject.gradeId||"",sourceCurriculumId:sourceId,title:ch.title,description:ch.description||"",order:ch.order,published:!!publish,createdAt:serverTimestamp()});chapterId=ref.id;}
  for(const lesson of ch.lessons){
   phase="حفظ الدرس: "+lesson.title;
   const payload={subjectId,gradeId:subject.gradeId||"",sourceCurriculumId:sourceId,chapterId,title:lesson.title,content:"",contentBlocks:lesson.contentBlocks||[],objectives:lesson.objectives||[],keyTerms:lesson.keyTerms||[],order:lesson.order,published:!!publish,updatedAt:serverTimestamp()};
   if(oldL)await updateDoc(doc(db,"lessons",oldL.id),payload);
   else await addDoc(collection(db,"lessons"),{...payload,createdAt:serverTimestamp()});
  }
  return {chapterCount:1,lessonCount:ch.lessons.length,updated};
 }catch(error){error.importPhase=phase;throw error;}
}
$("#medicalSurgicalPracticeImportForm")?.addEventListener("submit",async e=>{
 e.preventDefault();const subjectId=val("medicalSurgicalPracticeSubject"),publish=checked("medicalSurgicalPracticePublish");
 if(!subjectId)return report("اختر مادة Medical surgical nursing practice للسنة الثانية.","error");
 const button=e.submitter;if(button)button.disabled=true;
 try{const result=await importMedicalSurgicalPracticePilot(subjectId,publish);report((result.updated?"تم تحديث الإجراء التجريبي. ":"تم استيراد الإجراء التجريبي. ")+result.chapterCount+" فصل و"+result.lessonCount+" درس. "+(publish?"تم نشره للطلاب.":"حُفظ كمسودة."),"success");await refresh();}
 catch(error){report("تعذر الاستيراد | المرحلة: "+(error.importPhase||"غير محددة")+" | "+(error.message||String(error)),"error");console.error(error);}
 finally{if(button)button.disabled=false;}
});
$("#adminLogout").onclick=async()=>{await signOut(auth);location.replace("admin-login");};$("#addQuestion").onclick=addQuestion;
$("#gamificationTaskForm").onsubmit=async e=>{e.preventDefault();const gradeId=val("gamificationTaskGrade"),rewardXp=Number(val("gamificationTaskXp"));if(!gradesCache.some(g=>g.id===gradeId&&g.active!==false)||!Number.isInteger(rewardXp)||rewardXp<1||rewardXp>100)return report("اختر صفًا نشطًا وحدد مكافأة من 1 إلى 100 XP.","error");try{await addDoc(collection(db,"gamificationTasks"),{title:val("gamificationTaskTitle"),description:val("gamificationTaskDescription"),gradeId,rewardXp,published:checked("gamificationTaskPublished"),createdAt:serverTimestamp()});e.target.reset();report("تم حفظ المهمة التعليمية.","success");await refresh();}catch(x){failed(x);}};
$("#manualXpForm").onsubmit=async e=>{e.preventDefault();const uid=val("manualXpUid"),amount=Number(val("manualXpAmount")),reason=val("manualXpReason");if(!uid||!Number.isInteger(amount)||amount<1||amount>500||reason.length<5)return report("أدخل UID صحيحًا ومكافأة من 1 إلى 500 وسببًا واضحًا.","error");try{const profileRef=doc(db,"publicProfiles",uid),txId=doc(collection(db,"xpTransactions")).id,txRef=doc(db,"xpTransactions",txId);await runTransaction(db,async transaction=>{const profileSnap=await transaction.get(profileRef);if(!profileSnap.exists())throw new Error("PUBLIC_PROFILE_MISSING");transaction.update(profileRef,{xp:(Number(profileSnap.data().xp)||0)+amount,updatedAt:serverTimestamp()});transaction.set(txRef,{uid,amount,sourceType:"manual",sourceId:txId,reason,createdAt:serverTimestamp()});});e.target.reset();report("تم تسجيل المكافأة وإضافة "+amount+" XP مع حفظ سجلها.","success");}catch(x){failed(x);}};
$("#gradeForm").onsubmit=async e=>{e.preventDefault();const name=val("gradeName");if(name.length<3)return report("اكتب اسم الصف بشكل صحيح.","error");try{await addDoc(collection(db,"grades"),{name,active:true,order:Number(val("gradeOrder"))||1,createdAt:serverTimestamp()});e.target.reset();report("تمت إضافة الصف الدراسي.","success");await refresh();}catch(x){failed(x);}};
$("#subjectForm").onsubmit=async e=>{e.preventDefault();try{const grade=gradesCache.find(g=>g.id===val("subjectYear"));if(!grade)return report("اختر صفًا دراسيًا صحيحًا.","error");await addDoc(collection(db,"subjects"),{title:val("subjectTitle"),gradeId:grade.id,year:grade.name,grade:grade.name,term:val("subjectTerm"),description:val("subjectDescription"),order:Number(val("subjectOrder"))||1,published:checked("subjectPublished"),createdAt:serverTimestamp()});e.target.reset();report("تم حفظ المادة.","success");await refresh();}catch(x){failed(x);}};
$("#chapterSubject").onchange=async()=>{const subjectId=val("chapterSubject"),s=$("#chapterSubject");const lessonSubject=$("#lessonSubject");if(lessonSubject)lessonSubject.value=subjectId;await loadChapterOptions(subjectId);};
async function loadChapterOptions(subjectId){const select=$("#lessonChapter");if(!select)return;select.replaceChildren(new Option("درس غير مرتبط بفصل",""));if(!subjectId)return;const snap=await getDocs(query(collection(db,"chapters"),where("subjectId","==",subjectId)));snap.docs.map(d=>({id:d.id,...d.data()})).sort((x,y)=>(x.order||0)-(y.order||0)).forEach(x=>select.add(new Option(x.title||"Chapter",x.id)));}
$("#lessonSubject").onchange=()=>loadChapterOptions(val("lessonSubject"));
$("#chapterForm").onsubmit=async e=>{e.preventDefault();try{const subjectId=val("chapterSubject"),subjectSnap=await getDoc(doc(db,"subjects",subjectId));if(!subjectSnap.exists())return report("اختر مادة صحيحة.","error");const subject=subjectSnap.data();await addDoc(collection(db,"chapters"),{subjectId,gradeId:subject.gradeId,title:val("chapterTitle"),description:val("chapterDescription"),order:Number(val("chapterOrder"))||1,published:checked("chapterPublished"),createdAt:serverTimestamp()});e.target.reset();report("تم إنشاء الفصل وربطه بالمادة.","success");await refresh();}catch(x){failed(x);}};
$("#addLessonBlock").onclick=()=>addLessonBlock(val("lessonBlockType")||"paragraph");
if($("#lessonBlockEditor")&&!$("#lessonBlockEditor").children.length)addLessonBlock("paragraph");
$("#loadLessonForEdit").onclick=async()=>{
 const id=val("lessonEditSelect");if(!id)return report("اختر محاضرة أولًا.","error");
 try{const snap=await getDoc(doc(db,"lessons",id));if(!snap.exists())return report("المحاضرة غير موجودة.","error");const d=snap.data();editingLessonId=id;
 $("#lessonSubject").value=d.subjectId||"";await loadChapterOptions(d.subjectId||"");$("#lessonChapter").value=d.chapterId||"";
 $("#lessonTitle").value=d.title||"";$("#lessonOrder").value=d.order||1;$("#lessonPublished").checked=!!d.published;$("#lessonContent").value=d.content||"";
 $("#lessonObjectives").value=(d.objectives||[]).join(String.fromCharCode(10));$("#lessonKeyTerms").value=(d.keyTerms||[]).join(String.fromCharCode(10));
 $("#lessonBlockEditor").replaceChildren();(d.contentBlocks||[]).forEach(block=>addLessonBlock(block.type,block));if(!d.contentBlocks?.length)addLessonBlock("paragraph");
 $("#lessonForm button[type=submit]").textContent="حفظ تعديلات المحاضرة";$("#cancelLessonEdit").hidden=false;
 report("تم تحميل المحاضرة. عدّل الوحدات ثم احفظ التغييرات.","success");$("#lessonForm").scrollIntoView({behavior:"smooth",block:"start"});
 }catch(e){failed(e);}
};
$("#cancelLessonEdit").onclick=()=>{editingLessonId=null;$("#lessonForm").reset();$("#lessonBlockEditor").replaceChildren();addLessonBlock("paragraph");$("#lessonForm button[type=submit]").textContent="حفظ الدرس";$("#cancelLessonEdit").hidden=true;report("تم إلغاء وضع التعديل.");};
$("#lessonForm").onsubmit=async e=>{
 e.preventDefault();
 try{
  const subjectSnap=await getDoc(doc(db,"subjects",val("lessonSubject")));
  if(!subjectSnap.exists())return report("المادة المختارة غير موجودة.","error");
  const contentBlocks=readLessonBlocks(),legacy=val("lessonContent");
  for(const block of contentBlocks){
   if(block.type==="image"){try{const u=new URL(block.url);if(u.protocol!=="https:")throw new Error();}catch{return report("رابط الصورة غير صالح. استخدم رابط صورة آمنًا يبدأ بـ HTTPS.","error");}}
   if(block.type==="table"&&block.rows.some(row=>row.length<2))return report("تأكد أن كل صف في الجدول يحتوي على عمودين على الأقل.","error");
  }
  if(!contentBlocks.length&&!legacy)return report("أضف وحدة محتوى واحدة على الأقل أو اكتب محتوى نصيًا.","error");
  const lessonData={subjectId:val("lessonSubject"),chapterId:val("lessonChapter")||"",gradeId:subjectSnap.data().gradeId,title:val("lessonTitle"),content:legacy,contentBlocks,objectives:val("lessonObjectives").split(String.fromCharCode(10)).map(x=>x.trim()).filter(Boolean),keyTerms:val("lessonKeyTerms").split(String.fromCharCode(10)).map(x=>x.trim()).filter(Boolean),order:Number(val("lessonOrder"))||1,published:checked("lessonPublished"),updatedAt:serverTimestamp()};
  if(editingLessonId){await updateDoc(doc(db,"lessons",editingLessonId),lessonData);report("تم تحديث المحاضرة بنجاح.","success");}else{await addDoc(collection(db,"lessons"),{...lessonData,createdAt:serverTimestamp()});report("تم حفظ المحاضرة بمحتواها المنظم.","success");}
  editingLessonId=null;e.target.reset();$("#lessonBlockEditor").replaceChildren();addLessonBlock("paragraph");$("#lessonForm button[type=submit]").textContent="حفظ الدرس";$("#cancelLessonEdit").hidden=true;await refresh();
 }catch(x){failed(x);}
};
$("#examForm").onsubmit=async e=>{e.preventDefault();const questions=[...document.querySelectorAll(".question-editor")].map(w=>({text:w.querySelector(".q-text").value.trim(),choices:[...w.querySelectorAll(".q-choice")].map(i=>i.value.trim()),points:Number(w.querySelector(".q-points").value)||1,correctIndex:Number(w.querySelector(".q-correct").value)}));if(!questions.length||questions.some(q=>!q.text||q.choices.some(c=>!c)))return report("أكمل سؤالًا واحدًا على الأقل والاختيارات الأربعة.","error");try{const publicQuestions=questions.map(({text,choices,points})=>({text,choices,points})),correctIndexes=questions.map(q=>q.correctIndex);const examSubjectId=val("examSubject");const subjectSnap=examSubjectId?await getDoc(doc(db,"subjects",examSubjectId)):null;const examGradeId=subjectSnap?.exists()?subjectSnap.data().gradeId:val("examGrade");if(!examGradeId)return report("اختر الصف الدراسي للاختبار.","error");const created=await addDoc(collection(db,"exams"),{gradeId:examGradeId,title:val("examTitle"),description:val("examDescription"),subjectId:examSubjectId,duration:Number(val("examDuration"))||30,questions:publicQuestions,published:false,createdAt:serverTimestamp()});await setDoc(doc(db,"examAnswerKeys",created.id),{examId:created.id,correctIndexes,createdAt:serverTimestamp()});if(checked("examPublished"))await updateDoc(doc(db,"exams",created.id),{published:true});e.target.reset();$("#questionsContainer").replaceChildren();report("تم إنشاء الاختبار. التصحيح تلقائي عند التسليم، ومكافأة XP تُحسب حسب نسبة النجاح.","success");await refresh();}catch(x){failed(x);}};
$("#libraryForm").onsubmit=async e=>{e.preventDefault();try{await addDoc(collection(db,"library"),{gradeId:val("resourceGrade"),title:val("resourceTitle"),description:val("resourceDescription"),type:val("resourceType"),url:val("resourceUrl"),published:checked("resourcePublished"),createdAt:serverTimestamp()});e.target.reset();report("تم حفظ المورد.","success");await refresh();}catch(x){failed(x);}};
$("#noticeForm").onsubmit=async e=>{e.preventDefault();try{await addDoc(collection(db,"notifications"),{title:val("noticeTitle"),body:val("noticeBody"),published:checked("noticePublished"),createdAt:serverTimestamp()});e.target.reset();report("تم نشر الإشعار.","success");}catch(x){failed(x);}};
$("#revisionForm").onsubmit=async e=>{e.preventDefault();try{await addDoc(collection(db,"revisionCards"),{gradeId:val("revisionGrade"),title:val("revisionTitle"),content:val("revisionContent"),published:checked("revisionPublished"),createdAt:serverTimestamp()});e.target.reset();report("تم حفظ بطاقة المراجعة.","success");}catch(x){failed(x);}};
$("#challengeForm").onsubmit=async e=>{e.preventDefault();const choices=[0,1,2,3].map(i=>val("challengeChoice"+i));if(choices.some(x=>!x))return report("أكمل الاختيارات الأربعة.","error");try{const created=await addDoc(collection(db,"dailyChallenges"),{gradeId:val("challengeGrade"),title:val("challengeTitle"),question:val("challengeQuestion"),choices,rewardXp:Math.max(0,Math.min(40,val("challengeRewardXp")===""?10:Number(val("challengeRewardXp")))),publishedAt:checked("challengePublished")?serverTimestamp():null,published:false,createdAt:serverTimestamp()});await setDoc(doc(db,"challengeAnswerKeys",created.id),{challengeId:created.id,correctIndex:Number(val("challengeCorrect")),createdAt:serverTimestamp()});if(checked("challengePublished"))await updateDoc(doc(db,"dailyChallenges",created.id),{published:true});e.target.reset();report("تم حفظ التحدي. سيظهر للطلاب لمدة 24 ساعة من وقت نشره، ومكافأته XP محددة في النموذج.","success");}catch(x){failed(x);}};
$("#simulationForm").onsubmit=async e=>{e.preventDefault();try{const steps=val("simulationSteps").split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean);if(!steps.length)return report("أضف خطوة واحدة على الأقل.","error");await addDoc(collection(db,"simulations"),{gradeId:val("simulationGrade"),title:val("simulationTitle"),description:val("simulationDescription"),steps,published:checked("simulationPublished"),createdAt:serverTimestamp()});e.target.reset();report("تم حفظ سيناريو المحاكاة.","success");}catch(x){failed(x);}};
onAuthStateChanged(auth,async u=>{if(!u){location.replace("admin-login");return;}try{if(!(await allowed(u))){report("هذا الحساب غير مصرح له بدخول الإدارة.","error");await signOut(auth);return;}workspace.hidden=false;report("تم التحقق من صلاحيات المدير.","success");await refresh();}catch(e){failed(e);}});


async function importFirstYearAnatomyCurriculum(subjectId,publish){
 let phase="التحقق من المادة";
 try{
  const snap=await getDoc(doc(db,"subjects",subjectId));if(!snap.exists())throw new Error("SUBJECT_NOT_FOUND");
  const subject=snap.data();const title=String(subject.title||"").trim().toLowerCase().replace(/[^a-z]/g,"");
  if(!["anatomy","anatomyandphysiology","anatomyphysiology"].includes(title))throw new Error("WRONG_SUBJECT");
  const norm=v=>String(v||"").toLowerCase().replace(/[\\u064B-\\u065F\\u0670ـ]/g,"").replace(/[أإآ]/g,"ا");
  const gradeText=[subject.year,subject.grade,subject.gradeName,gradesCache.find(g=>g.id===subject.gradeId)?.name].filter(Boolean).join(" ");
  if(/second|2nd|year\\s*2|grade\\s*2|ثاني|الثاني/i.test(norm(gradeText)))throw new Error("WRONG_GRADE");
  const firstGrade=gradesCache.find(g=>/(first|1st|year\\s*1|grade\\s*1|اول|الاول|الاولى)/i.test(norm(g.name||"")));
  const gradeId=subject.gradeId||firstGrade?.id||"";
  phase="تحميل ملف المنهج";
  const response=await fetch("content/first-year/anatomy-curriculum.json",{cache:"no-store"});if(!response.ok)throw new Error("CURRICULUM_FILE_NOT_FOUND");
  const curriculum=await response.json();if(!Array.isArray(curriculum.chapters)||!curriculum.chapters.length||!curriculum.chapters.every(c=>Array.isArray(c.lessons)))throw new Error("CURRICULUM_INVALID");
  if(publish&&curriculum.contentStatus!=="complete")throw new Error("CURRICULUM_NOT_COMPLETE");
  phase="فحص المحتوى السابق";
  const [cs,ls]=await Promise.all([getDocs(query(collection(db,"chapters"),where("subjectId","==",subjectId))),getDocs(query(collection(db,"lessons"),where("subjectId","==",subjectId)))]);
  const sourceId="anatomy-first-year-textbook";const oldC=cs.docs.filter(x=>x.data().sourceCurriculumId===sourceId),oldL=ls.docs.filter(x=>x.data().sourceCurriculumId===sourceId);
  const chapterMap=new Map(oldC.map(x=>[x.data().title,x]));const lessonMap=new Map(oldL.map(x=>[x.data().title,x]));
  let chapterCount=0,lessonCount=0,updated=oldC.length>0||oldL.length>0;
  for(const chapter of curriculum.chapters){
   phase="حفظ الفصل: "+chapter.title;let ch=chapterMap.get(chapter.title);
   const chapterData={subjectId,gradeId,sourceCurriculumId:sourceId,title:chapter.title,description:chapter.description||"",order:chapter.order,published:!!publish,updatedAt:serverTimestamp()};
   if(ch)await updateDoc(doc(db,"chapters",ch.id),chapterData);
   else{const ref=await addDoc(collection(db,"chapters"),{...chapterData,createdAt:serverTimestamp()});ch={id:ref.id};}
   chapterCount++;
   for(const lesson of chapter.lessons){
    phase="حفظ المحاضرة: "+lesson.title;const old=lessonMap.get(lesson.title);
    const data={subjectId,gradeId,sourceCurriculumId:sourceId,chapterId:ch.id,title:lesson.title,content:"",contentBlocks:lesson.contentBlocks||[],objectives:lesson.objectives||[],keyTerms:lesson.keyTerms||[],order:lesson.order,published:!!publish,updatedAt:serverTimestamp()};
    if(old)await updateDoc(doc(db,"lessons",old.id),data);else await addDoc(collection(db,"lessons"),{...data,createdAt:serverTimestamp()});
    lessonCount++;
   }
  }
  return {chapterCount,lessonCount,updated,contentStatus:curriculum.contentStatus};
 }catch(error){error.importPhase=phase;throw error;}
}

$("#anatomyCurriculumImportForm")?.addEventListener("submit",async e=>{
 e.preventDefault();const subjectId=val("anatomyCurriculumSubject"),publish=checked("anatomyCurriculumPublish");if(!subjectId)return report("اختر مادة Anatomy للسنة الأولى أولًا.","error");
 const button=e.submitter;if(button)button.disabled=true;
 try{const result=await importFirstYearAnatomyCurriculum(subjectId,publish);report((result.updated?"تم تحديث ":"تم استيراد ")+result.chapterCount+" فصلًا و"+result.lessonCount+" محاضرة. "+(publish?"المحتوى منشور.":"المحتوى محفوظ كمسودة للمراجعة.")+" حالة الملف: "+result.contentStatus,"success");await refresh();}
 catch(error){const messages={SUBJECT_NOT_FOUND:"المادة غير موجودة.",WRONG_SUBJECT:"اختر مادة Anatomy فقط.",WRONG_GRADE:"المادة المختارة ليست للصف الأول.",CURRICULUM_FILE_NOT_FOUND:"ملف المنهج غير موجود.",CURRICULUM_INVALID:"بنية ملف المنهج غير صالحة.",CURRICULUM_NOT_COMPLETE:"المنهج ما زال قيد الاستكمال؛ استورده كمسودة للمراجعة أولًا."};report((messages[error.message]||"تعذر الاستيراد")+" | المرحلة: "+(error.importPhase||"غير محددة")+" | "+(error.message||String(error)),"error");console.error("Anatomy curriculum import failed",error);}
 finally{if(button)button.disabled=false;}
});
