import {auth} from "./config.js";
import {onAuthStateChanged} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";

const API="https://api.bawabet-altamreed.com";
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search),sessionId=params.get("sessionId");
$("backLink").href=params.get("from")==="teacher"?"teacher-dashboard.html":"student-academy.html";
let room=null,currentUser=null,role="student",canSpeak=false,handRaised=false,micOn=false,cameraOn=false,screenOn=false;
const pendingHands=new Map();
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function status(message,error=false){$("liveNotice").textContent=message;$("liveNotice").dataset.state=error?"error":"ok";}
function addMessage(name,message,kind="chat"){
 const item=document.createElement("div");item.className="live-chat-item"+(kind==="system"?" is-system":"");
 item.innerHTML="<strong>"+esc(name)+"</strong><span>"+esc(message)+"</span>";$("liveChatMessages").append(item);$("liveChatMessages").scrollTop=$("liveChatMessages").scrollHeight;
}
function addTile(identity,name,track,isLocal=false){
 const id="tile-"+identity.replace(/[^a-zA-Z0-9_-]/g,"_");
 let tile=document.getElementById(id);
 if(!tile){tile=document.createElement("article");tile.className="live-video-tile";tile.id=id;const label=document.createElement("span");label.className="live-video-name";label.textContent=name||identity;const media=document.createElement("div");media.className="live-video-media";tile.append(media,label);$("liveVideoGrid").append(tile);}
 if(track){const element=track.attach();element.autoplay=true;element.playsInline=true;tile.querySelector(".live-video-media").append(element);}
 return tile;
}
function removeTile(identity){document.getElementById("tile-"+identity.replace(/[^a-zA-Z0-9_-]/g,"_"))?.remove();}
function renderHands(){
 const box=$("liveHandsList");box.replaceChildren();
 if(!pendingHands.size){box.innerHTML='<p class="live-empty">لا توجد طلبات مشاركة حاليًا.</p>';return;}
 for(const [identity,name] of pendingHands){
  const row=document.createElement("div");row.className="live-hand-request";
  const label=document.createElement("span");label.textContent=name+" رفع إيده";
  const allow=document.createElement("button");allow.className="live-small-btn live-allow";allow.textContent="السماح بالمشاركة";
  allow.onclick=()=>setSpeaker(identity,true,name);
  const deny=document.createElement("button");deny.className="live-small-btn";deny.textContent="رفض";
  deny.onclick=()=>{pendingHands.delete(identity);renderHands();};
  row.append(label,allow,deny);box.append(row);
 }
}
async function api(path,body){
 const token=await currentUser.getIdToken();
 const response=await fetch(API+path,{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+token},body:JSON.stringify(body)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||"تعذر تنفيذ الطلب.");
 return data;
}
async function setSpeaker(identity,allow,name){
 try{
  await api("/api/live/permissions",{sessionId,studentUid:identity,allow});
  pendingHands.delete(identity);renderHands();
  addMessage("النظام",allow?"تم السماح لـ "+name+" بالمشاركة الصوتية والمرئية.":"تم إيقاف صلاحية المشاركة.", "system");
 }catch(error){status(error.message,true);}
}
async function sendData(payload){
 if(!room)return;
 await room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(payload)),{reliable:true});
}
async function connect(user){
 currentUser=user;status("جارٍ التحقق من العضوية وتجهيز الفصل...");
 const result=await api("/api/live/join",{sessionId,displayName:user.displayName||user.email||"مستخدم"});
 if(!result.token||!result.serverUrl)throw new Error("بيانات الاتصال بخادم البث غير مكتملة.");
 role=result.role;
 const {Room,RoomEvent,Track}=await import("https://cdn.jsdelivr.net/npm/livekit-client@2.15.6/+esm");
 room=new Room({adaptiveStream:true,dynacast:true,stopLocalTrackOnUnpublish:true});
 room.on(RoomEvent.Connected,()=>{status(role==="teacher"?"أنت داخل الفصل بصلاحيات المدرس.":"تم دخول المحاضرة بنجاح.");$("liveParticipantCount").textContent=String(room.numParticipants+1);});
 room.on(RoomEvent.LocalTrackPublished,(publication,participant)=>{if(publication.track&&publication.kind===Track.Kind.Video)addTile(user.uid,user.displayName||"أنت",publication.track,true);});
 room.on(RoomEvent.LocalTrackUnpublished,(publication)=>{if(publication.track){publication.track.detach().forEach(el=>el.remove());}});
 room.on(RoomEvent.ParticipantConnected,p=>{$("liveParticipantCount").textContent=String(room.numParticipants+1);addMessage("النظام",p.name+" انضم للمحاضرة.","system");});
 room.on(RoomEvent.ParticipantDisconnected,p=>{$("liveParticipantCount").textContent=String(room.numParticipants+1);removeTile(p.identity);});
 room.on(RoomEvent.TrackSubscribed,(track,publication,participant)=>{
  if(track.kind===Track.Kind.Video)addTile(participant.identity,participant.name||participant.identity,track);
  else if(track.kind===Track.Kind.Audio){const audio=track.attach();audio.autoplay=true;document.body.append(audio);}
 });
 room.on(RoomEvent.TrackUnsubscribed,(track,publication,participant)=>{track.detach().forEach(el=>el.remove());if(track.kind===Track.Kind.Video)removeTile(participant.identity);});
 room.on(RoomEvent.DataReceived,(payload,participant)=>{
  let data;try{data=JSON.parse(new TextDecoder().decode(payload));}catch{return;}
  const sender=participant?.identity||"مشارك",name=participant?.name||sender;
  if(data.type==="hand"&&role==="teacher"){pendingHands.set(sender,name);renderHands();addMessage("النظام",name+" طلب المشاركة.","system");}
  if(data.type==="chat")addMessage(name,String(data.message||"").slice(0,500));
  if(data.type==="hand-cancel"&&role==="teacher"){pendingHands.delete(sender);renderHands();}
  if(data.type==="speaker-approved"&&sender==="system"){canSpeak=true;status("المدرس سمح لك بالمشاركة. يمكنك فتح المايك أو الكاميرا.");$("liveStudentSpeakerControls").hidden=false;}
 });
 room.on(RoomEvent.ParticipantPermissionsChanged,()=>{const p=room.localParticipant.permissions;canSpeak=!!p?.canPublish;if(canSpeak){$("liveStudentSpeakerControls").hidden=false;status("أصبح بإمكانك المشاركة في المحاضرة.");}});
 await room.connect(result.serverUrl,result.token);
 $("liveTitle").textContent=result.title||"المحاضرة المباشرة";
 $("liveParticipantCount").textContent=String(room.numParticipants+1);
 $("liveTeacherMediaControls").hidden=role!=="teacher";
 $("liveTeacherTools").hidden=role!=="teacher";
 $("liveStudentControls").hidden=role==="teacher";
 addTile(user.uid,user.displayName||"أنت",null,true);
}
async function toggleTrack(kind,enabled){
 try{
  if(kind==="mic")await room.localParticipant.setMicrophoneEnabled(enabled);
  if(kind==="camera")await room.localParticipant.setCameraEnabled(enabled);
  if(kind==="screen")await room.localParticipant.setScreenShareEnabled(enabled);
  const button=$(kind==="mic"?"liveMic":kind==="camera"?"liveCamera":"liveScreen");
  button?.classList.toggle("is-active",enabled);
 }catch(error){status(error.message||"تعذر تشغيل الوسيلة. تحقق من أذونات المتصفح.",true);}
}
$("liveMic")?.addEventListener("click",()=>toggleTrack("mic",!micOn));
$("liveStudentMic")?.addEventListener("click",()=>toggleTrack("mic",!room?.localParticipant.isMicrophoneEnabled));
$("liveCamera")?.addEventListener("click",()=>toggleTrack("camera",!cameraOn));
$("liveStudentCamera")?.addEventListener("click",()=>toggleTrack("camera",!room?.localParticipant.isCameraEnabled));
$("liveScreen")?.addEventListener("click",()=>toggleTrack("screen",!screenOn));
$("liveRaiseHand")?.addEventListener("click",async()=>{
 if(!room)return;
 handRaised=!handRaised;
 try{await sendData({type:handRaised?"hand":"hand-cancel"});$("liveRaiseHand").textContent=handRaised?"إلغاء رفع اليد":"✋ رفع اليد";}catch(error){status(error.message,true);}
});
$("liveChatForm")?.addEventListener("submit",async e=>{
 e.preventDefault();const input=$("liveChatInput"),message=input.value.trim();if(!message)return;
 try{await sendData({type:"chat",message:message.slice(0,500)});addMessage("أنت",message);input.value="";}catch(error){status(error.message,true);}
});
$("liveLeave")?.addEventListener("click",async()=>{try{await room?.disconnect();}finally{location.href=$("backLink").href;}});
window.addEventListener("pagehide",()=>{try{room?.disconnect();}catch{}});
if(!sessionId)status("رابط المحاضرة غير مكتمل.",true);
else onAuthStateChanged(auth,user=>{if(!user){location.replace("login.html");return;}connect(user).catch(error=>{console.error(error);status(error.message||"تعذر دخول الفصل.",true);});});
