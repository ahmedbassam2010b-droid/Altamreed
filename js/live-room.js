import {auth} from "./config.js";
import {onAuthStateChanged} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
const API="https://api.bawabet-altamreed.com";
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search),sessionId=params.get("sessionId");
$("backLink").href=params.get("from")==="teacher"?"teacher-dashboard.html":"student-academy.html";
function status(message,error=false){$("liveNotice").textContent=message;$("liveNotice").style.color=error?"#ffe0e0":"#d9edf5";}
let meetingApi=null;
window.addEventListener("pagehide",()=>{try{meetingApi?.dispose();}catch{}});
function loadJaasScript(appId){
 return new Promise((resolve,reject)=>{
  if(window.JitsiMeetExternalAPI)return resolve();
  const script=document.createElement("script");
  script.src="https://8x8.vc/"+encodeURIComponent(appId)+"/external_api.js";
  script.async=true;script.onload=()=>window.JitsiMeetExternalAPI?resolve():reject(new Error("تعذر تحميل واجهة قاعة المحاضرة."));
  script.onerror=()=>reject(new Error("تعذر الاتصال بخدمة قاعات الفيديو."));
  document.head.append(script);
 });
}
if(!sessionId){status("رابط المحاضرة غير مكتمل.",true);}
else{
 onAuthStateChanged(auth,async user=>{
  if(!user){location.replace("login.html");return;}
  try{
   status("جارٍ التحقق من عضويتك وتجهيز القاعة...");
   const token=await user.getIdToken();
   const response=await fetch(API+"/api/live/join",{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+token},body:JSON.stringify({sessionId,displayName:user.displayName||"طالب"})});
   const result=await response.json().catch(()=>({}));
   if(!response.ok||!result.jwt||!result.appId||!result.roomName)throw new Error(result.error||"تعذر دخول المحاضرة.");
   await loadJaasScript(result.appId);
   $("liveTitle").textContent="المحاضرة المباشرة";
   meetingApi=new window.JitsiMeetExternalAPI("8x8.vc",{
    roomName:result.roomName,jwt:result.jwt,parentNode:$("liveMeeting"),width:"100%",height:"100%",lang:"ar",
    userInfo:{displayName:result.displayName||user.displayName||"مستخدم"},
    configOverwrite:{prejoinConfig:{enabled:true},startWithAudioMuted:true,startWithVideoMuted:true,disableDeepLinking:true,enableWelcomePage:false},
    interfaceConfigOverwrite:{DEFAULT_LANGUAGE:"ar",MOBILE_APP_PROMO:false}
   });
   meetingApi.addListener("videoConferenceJoined",()=>status(result.role==="teacher"?"تم دخولك بصلاحيات المدرس وإدارة المحاضرة.":"تم دخولك للمحاضرة بنجاح."));
   meetingApi.addListener("readyToClose",()=>status("انتهت المحاضرة. يمكنك العودة إلى الأكاديمية."));
   meetingApi.addListener("videoConferenceLeft",()=>status("غادرت قاعة المحاضرة."));
   status("تم تجهيز القاعة. اسمح باستخدام الكاميرا والميكروفون عند الحاجة.");
  }catch(error){console.error(error);status(error.message||"حدث خطأ أثناء دخول القاعة.",true);}
 });
}
