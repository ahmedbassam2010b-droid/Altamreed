import {auth} from "./config.js";
import {onAuthStateChanged} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {defineCustomElements} from "https://cdn.jsdelivr.net/npm/@cloudflare/realtimekit-ui@latest/loader/index.es2017.js";
const API="https://api.bawabet-altamreed.com";
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search),sessionId=params.get("sessionId");
$("backLink").href=params.get("from")==="teacher"?"teacher-dashboard.html":"student-academy.html";
function status(message,error=false){$("liveNotice").textContent=message;$("liveNotice").style.color=error?"#ffe0e0":"#d9edf5";}
if(!sessionId){status("رابط المحاضرة غير مكتمل.",true);}
else{
 await defineCustomElements();
 onAuthStateChanged(auth,async user=>{
  if(!user){location.replace("login.html");return;}
  try{
   const token=await user.getIdToken();
   const response=await fetch(API+"/api/live/join",{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+token},body:JSON.stringify({sessionId,displayName:user.displayName||"طالب"})});
   const result=await response.json().catch(()=>({}));
   if(!response.ok||!result.authToken)throw new Error(result.error||"تعذر دخول المحاضرة.");
   if(!window.RealtimeKitClient?.init)throw new Error("تعذر تحميل نظام البث. حدّث الصفحة وحاول مرة أخرى.");
   $("liveTitle").textContent="المحاضرة المباشرة";
   const meeting=await window.RealtimeKitClient.init({authToken:result.authToken});
   $("liveMeeting").meeting=meeting;
   status(result.role==="teacher"?"أنت تدخل بصلاحيات المدرس وإدارة المحاضرة.":"أنت تدخل كمشاهد. يمكنك طلب المشاركة من أدوات المحاضرة.");
  }catch(error){console.error(error);status(error.message||"حدث خطأ أثناء دخول القاعة.",true);}
 });
}
