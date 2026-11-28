const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8",...headers}});
const cors=(origin)=>({
 "access-control-allow-origin":origin,
 "access-control-allow-methods":"GET,POST,PUT,OPTIONS",
 "access-control-allow-headers":"authorization,content-type,range",
 "access-control-expose-headers":"content-length,content-range,accept-ranges,etag",
 "vary":"Origin"
});
function allowedOrigin(origin){return /^https:\/\/(?:www\.)?bawabet-altamreed\.com$/.test(origin)||/^https:\/\/[a-z0-9-]+\.bawabet-altamreed\.com$/.test(origin);}
async function authenticate(request,env){
 const token=(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!token)throw new Error("يلزم تسجيل الدخول أولًا.");
 const response=await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key="+encodeURIComponent(env.FIREBASE_API_KEY),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({idToken:token})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||!data.users?.[0]?.localId)throw new Error("انتهت جلسة الدخول. سجّل الدخول مرة أخرى.");
 return {uid:data.users[0].localId,name:data.users[0].displayName||data.users[0].email||"مستخدم",token};
}
async function firestoreDoc(path,user,env){
 const url="https://firestore.googleapis.com/v1/projects/"+env.FIREBASE_PROJECT_ID+"/databases/(default)/documents/"+path.split("/").map(encodeURIComponent).join("/");
 const response=await fetch(url,{headers:{authorization:"Bearer "+user.token}});
 if(response.status===404)return null;
 if(!response.ok)throw new Error("تعذر التحقق من صلاحيات الحساب وقواعد Firestore.");
 return response.json();
}
const field=(doc,name)=>doc?.fields?.[name];
const str=(doc,name)=>field(doc,name)?.stringValue||"";
const bool=(doc,name)=>field(doc,name)?.booleanValue===true;
const time=(doc,name)=>Date.parse(field(doc,name)?.timestampValue||"");
async function activeTeacher(uid,user,env){
 const doc=await firestoreDoc("teachers/"+uid,user,env),now=Date.now();
 if(!doc||!bool(doc,"active")||str(doc,"status")!=="active"||!Number.isFinite(time(doc,"subscriptionStartAt"))||!Number.isFinite(time(doc,"subscriptionEndAt"))||time(doc,"subscriptionStartAt")>now||time(doc,"subscriptionEndAt")<=now)throw new Error("اشتراك المدرس غير نشط أو منتهي.");
 return doc;
}
function b64url(bytes){let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");}
function base64urlJson(value){return b64url(new TextEncoder().encode(JSON.stringify(value)));}
async function jaasToken({uid,name,roomName,moderator},env){
 const appId=env.JAAS_APP_ID,keyId=env.JAAS_KEY_ID,raw=env.JAAS_PRIVATE_KEY;
 if(!appId||!keyId||!raw)throw new Error("إعداد Jitsi as a Service غير مكتمل على Worker.");
 const pem=raw.replace(/\\n/g,"\n").replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,"");
 let keyBytes;try{keyBytes=Uint8Array.from(atob(pem),c=>c.charCodeAt(0));}catch{throw new Error("مفتاح JaaS الخاص غير صالح. أعد نسخه بصيغة PEM PKCS8.");}
 let privateKey;try{privateKey=await crypto.subtle.importKey("pkcs8",keyBytes,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);}catch{throw new Error("تعذر قراءة المفتاح الخاص. تأكد أنه PEM بصيغة PKCS8.");}
 const now=Math.floor(Date.now()/1000),header={alg:"RS256",kid:appId+"/"+keyId,typ:"JWT"};
 const payload={aud:"jitsi",iss:"chat",sub:appId,room:roomName,exp:now+7200,nbf:now-10,context:{user:{id:uid,name:String(name||"مستخدم").slice(0,80),...(moderator?{moderator:"true"}:{})},features:{livestreaming:false,recording:false,transcription:false,"outbound-call":false}}};
 const unsigned=base64urlJson(header)+"."+base64urlJson(payload);
 const signature=await crypto.subtle.sign("RSASSA-PKCS1-v1_5",privateKey,new TextEncoder().encode(unsigned));
 return unsigned+"."+b64url(new Uint8Array(signature));
}
function safeName(name){return String(name||"file").normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g,"_").slice(-100)||"file";}
async function signTicket(key,exp,env){
 const secret=await crypto.subtle.importKey("raw",new TextEncoder().encode(env.DOWNLOAD_SIGNING_SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const bytes=await crypto.subtle.sign("HMAC",secret,new TextEncoder().encode(key+"\n"+exp));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
}
async function verifyTicket(key,exp,sig,env){
 if(!key||!/^\d+$/.test(exp)||Number(exp)<Date.now()||Number(exp)>Date.now()+11*60*1000)return false;
 const expected=await signTicket(key,exp,env);
 if(expected.length!==sig.length)return false;
 let diff=0;for(let i=0;i<expected.length;i++)diff|=expected.charCodeAt(i)^sig.charCodeAt(i);
 return diff===0;
}
async function handleApi(request,url,env,origin){
 const headers=cors(origin);
 if(!env.FIREBASE_API_KEY||!env.FIREBASE_PROJECT_ID)throw new Error("إعدادات Firebase غير مكتملة على Worker.");
 if(url.pathname.startsWith("/api/live/")&&(!env.JAAS_APP_ID||!env.JAAS_KEY_ID||!env.JAAS_PRIVATE_KEY))throw new Error("إعداد Jitsi as a Service غير مكتمل على Worker.");
 if(url.pathname.startsWith("/api/files/")&&(!env.FILES||!env.DOWNLOAD_SIGNING_SECRET))throw new Error("إعداد تخزين R2 غير مكتمل على Worker.");
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(!allowedOrigin(origin))return json({error:"Origin not allowed"},403,headers);
 if(url.pathname==="/api/live/create"&&request.method==="POST"){
  const user=await authenticate(request,env),body=await request.json();
  await activeTeacher(user.uid,user,env);
  const meetingId=crypto.randomUUID().replace(/-/g,"");
  return json({meetingId,provider:"jaas"},200,headers);
 }
 if(url.pathname==="/api/live/join"&&request.method==="POST"){
  const user=await authenticate(request,env),body=await request.json(),sessionId=String(body.sessionId||"");
  if(!/^[A-Za-z0-9_-]{10,150}$/.test(sessionId))throw new Error("بيانات المحاضرة غير صحيحة.");
  const session=await firestoreDoc("teacherLiveSessions/"+sessionId,user,env);
  if(!session)throw new Error("المحاضرة غير موجودة.");
  const teacherUid=str(session,"teacherUid"),classId=str(session,"classId"),meetingId=str(session,"meetingId");
  if(!teacherUid||!classId||!meetingId)throw new Error("بيانات البث غير مكتملة.");
  if(str(session,"provider")!=="jaas")throw new Error("هذه المحاضرة أُنشئت بنظام البث السابق. اطلب من المدرس جدولة محاضرة جديدة.");
  await activeTeacher(teacherUid,user,env);
  const isTeacher=user.uid===teacherUid;
  if(!isTeacher){
   const membership=await firestoreDoc("academyMemberships/"+user.uid+"_"+teacherUid,user,env);
   if(!membership||str(membership,"status")!=="active"||str(membership,"classId")!==classId)throw new Error("هذه المحاضرة مخصصة لطلاب الصف المرتبط بعضويتك النشطة فقط.");
  }
  const start=time(session,"startsAt"),duration=Number(field(session,"durationMinutes")?.integerValue||90);
  if(start&&Date.now()<start-15*60*1000)throw new Error("المحاضرة لم يحن موعد فتحها بعد.");
  if(start&&Date.now()>start+(duration+30)*60*1000)throw new Error("انتهى وقت الانضمام لهذه المحاضرة.");
  if(str(session,"status")==="ended")throw new Error("أنهى المدرس هذه المحاضرة.");
  const appId=env.JAAS_APP_ID,roomName=appId+"/"+meetingId;
  const jwt=await jaasToken({uid:user.uid,name:body.displayName||user.name,roomName,moderator:isTeacher},env);
  return json({jwt,appId,roomName,role:isTeacher?"teacher":"student",displayName:String(body.displayName||user.name).slice(0,80)},200,headers);
 }
 if(url.pathname==="/api/files/start"&&request.method==="POST"){
  const user=await authenticate(request,env),body=await request.json();
  await activeTeacher(user.uid,user,env);
  const classId=String(body.classId||"");
  const klass=await firestoreDoc("teacherClasses/"+classId,user,env);
  if(!klass||str(klass,"teacherUid")!==user.uid)throw new Error("الصف غير تابع لأكاديميتك.");
  const size=Number(body.size||0);
  if(!Number.isSafeInteger(size)||size<1||size>50*1024*1024*1024)throw new Error("حجم الملف غير مدعوم. الحد الأقصى 5 جيجابايت.");
  const name=safeName(body.fileName),type=String(body.contentType||"application/octet-stream").slice(0,120);
  const allowedTypes=new Set(["application/pdf","image/png","image/jpeg","image/webp","image/gif","image/avif","video/mp4","video/webm","video/quicktime","video/x-matroska","application/zip","application/octet-stream","text/plain","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-powerpoint","application/vnd.openxmlformats-officedocument.presentationml.presentation","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
  if(!allowedTypes.has(type))throw new Error("نوع الملف غير مدعوم. ارفع PDF أو صورة أو فيديو أو ملف Office.");
  const key="teachers/"+user.uid+"/"+classId+"/"+crypto.randomUUID()+"-"+name;
  const upload=await env.FILES.createMultipartUpload(key,{httpMetadata:{contentType:type},customMetadata:{teacherUid:user.uid,classId,originalName:String(body.fileName||name).slice(0,180)}});
  return json({key,uploadId:upload.uploadId},200,headers);
 }
 if(url.pathname==="/api/files/part"&&request.method==="PUT"){
  const user=await authenticate(request,env);await activeTeacher(user.uid,user,env);
  const key=url.searchParams.get("key")||"",uploadId=url.searchParams.get("uploadId")||"",partNumber=Number(url.searchParams.get("partNumber"));
  if(!key.startsWith("teachers/"+user.uid+"/")||!uploadId||!Number.isInteger(partNumber)||partNumber<1||partNumber>10000)throw new Error("بيانات رفع الملف غير صحيحة.");
  const upload=env.FILES.resumeMultipartUpload(key,uploadId),part=await upload.uploadPart(partNumber,request.body);
  return json({partNumber,etag:part.etag},200,headers);
 }
 if(url.pathname==="/api/files/complete"&&request.method==="POST"){
  const user=await authenticate(request,env),body=await request.json();await activeTeacher(user.uid,user,env);
  const key=String(body.key||""),uploadId=String(body.uploadId||""),parts=body.parts;
  if(!key.startsWith("teachers/"+user.uid+"/")||!uploadId||!Array.isArray(parts)||!parts.length||parts.length>10000)throw new Error("بيانات إكمال الرفع غير صحيحة.");
  const upload=env.FILES.resumeMultipartUpload(key,uploadId);
  const result=await upload.complete(parts.map(p=>({partNumber:Number(p.partNumber),etag:String(p.etag)})));
  return json({key,size:result.size,etag:result.etag},200,headers);
 }
 if(url.pathname==="/api/files/ticket"&&request.method==="POST"){
  const user=await authenticate(request,env),body=await request.json(),contentId=String(body.contentId||"");
  const content=await firestoreDoc("teacherContent/"+contentId,user,env);
  if(!content)throw new Error("الملف غير موجود أو لا تملك صلاحية الوصول إليه.");
  const key=str(content,"storageKey");
  if(!key)throw new Error("هذا المحتوى لا يستخدم تخزين الملفات الجديد.");
  const exp=String(Date.now()+10*60*1000),sig=await signTicket(key,exp,env);
  return json({url:"https://api.bawabet-altamreed.com/api/files/stream?key="+encodeURIComponent(key)+"&exp="+exp+"&sig="+sig},200,headers);
 }
 if(url.pathname==="/api/files/stream"&&request.method==="GET"){
  const key=url.searchParams.get("key")||"",exp=url.searchParams.get("exp")||"",sig=url.searchParams.get("sig")||"";
  if(!key.startsWith("teachers/")||!await verifyTicket(key,exp,sig,env))return new Response("رابط الملف غير صالح أو انتهت صلاحيته.",{status:403});
  const range=request.headers.get("range"),head=await env.FILES.head(key);if(!head)return new Response("الملف غير موجود.",{status:404});
  let object,status=200,extra={},responseSize=head.size;
  if(range){
   const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match)return new Response("Invalid range",{status:416});
   const suffix=!match[1]&&match[2],start=suffix?Math.max(0,head.size-Number(match[2])):(match[1]?Number(match[1]):0);
   const end=suffix?head.size-1:(match[2]?Number(match[2]):head.size-1);
   if(start<0||end<start||start>=head.size)return new Response(null,{status:416});
   const last=Math.min(end,head.size-1);object=await env.FILES.get(key,{range:{offset:start,length:last-start+1}});status=206;
   extra["content-range"]="bytes "+start+"-"+last+"/"+head.size;responseSize=last-start+1;
  }else object=await env.FILES.get(key);
  const name=head.customMetadata?.originalName||key.split("/").pop();
  const contentType=head.httpMetadata?.contentType||"application/octet-stream",inline=contentType==="application/pdf"||contentType.startsWith("image/")||contentType.startsWith("video/")||contentType==="text/plain";
  const outHeaders={"content-type":contentType,"content-length":String(responseSize),"accept-ranges":"bytes","x-content-type-options":"nosniff","cache-control":"private, no-store","content-disposition":(inline?"inline":"attachment")+"; filename*=UTF-8''"+encodeURIComponent(name),...extra};
  return new Response(object.body,{status,headers:outHeaders});
 }
 return json({error:"Not found"},404,headers);
}
export default {async fetch(request,env){
 const url=new URL(request.url),origin=request.headers.get("origin")||"";
 try{
  if(url.pathname.startsWith("/api/"))return await handleApi(request,url,env,origin);
  return json({error:"Not found"},404,cors(origin));
 }catch(error){return json({error:error.message||"حدث خطأ غير متوقع."},400,cors(origin));}
}};
