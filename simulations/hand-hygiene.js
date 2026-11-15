/* Lesson source: Fundamentals of Nursing, Lesson 03, supplied pages 3–8.
   This first prototype uses the book's Antiseptic Hand Wash table as its step order.
   The illustration's 40–60 second total duration is displayed as source context;
   step 7 retains the table's 30-second friction duration. */

const steps = [
 {title:"Prepare the necessary equipment",description:"جهّز المعدات اللازمة قبل البدء.",rationale:"To save time and effort.",task:"equipment"},
 {title:"Stand in front of sink",description:"قف أمام الحوض، ولا تسمح لزيّك بملامسة الحوض أثناء الغسيل.",rationale:"To prevent cross infection.",task:"stand"},
 {title:"Remove jewelry & secure it",description:"أزل المجوهرات واحتفظ بها في مكان آمن.",rationale:"To avoid microorganisms accumulating inside accessory.",task:"jewelry"},
 {title:"Turn on water & adjust temperature",description:"شغّل المياه واضبط قوة التدفق ودرجة الحرارة حتى تصبح دافئة.",rationale:"To adjust water temperature.",task:"water"},
 {title:"Wet hands & wrist area",description:"بلّل اليدين والمعصمين، وأبقِ اليدين أسفل المرفقين ليسمح الماء بالتدفق نحو أطراف الأصابع.",rationale:"To avoid cross infection.",task:"wet"},
 {title:"Apply enough liquid soap",description:"استخدم 3–5 ml من الصابون السائل أو رغوة صابون القطعة، وغطِّ اليدين جيدًا.",rationale:"To cover all areas in hands.",task:"soap"},
 {title:"Rub all hand surfaces",description:"افرك راحتي اليدين وظهريهما وكل إصبع والعُقَل والمعصمين والساعدين بحركات ثابتة ودائرية لمدة 30 ثانية.",rationale:"To ensure cover all surfaces.",task:"rub"},
 {title:"Clean under fingernails",description:"نظّف أسفل الأظافر بظفر اليد الأخرى أو باستخدام عود Orangewood نظيف.",rationale:"To clean under nails.",task:"nails"},
 {title:"Rinse thoroughly",description:"اشطف جيدًا مع توجيه الماء نحو أطراف الأصابع.",rationale:"لم يذكر الجدول Rational لهذه الخطوة.",task:"rinse"},
 {title:"Dry hands",description:"جفّف بدءًا من الأصابع واتجه لأعلى نحو الساعد بمنشفة ورقية، ثم تخلّص منها فورًا دون لمس اليدين النظيفتين. يوضح الرسم استخدام المنشفة لإغلاق الصنبور.",rationale:"لم يذكر الجدول Rational لهذه الخطوة.",task:"dry"}
];

const $=id=>document.getElementById(id);
const ui={title:$("stepTitle"),description:$("stepDescription"),rationale:$("stepRationale"),area:$("actionArea"),feedback:$("feedback"),next:$("nextStep"),prev:$("previousStep"),bar:$("progressBar"),label:$("progressLabel"),sub:$("progressSub"),percent:$("progressPercent"),counter:$("stepCounter"),dots:$("stepDots"),status:$("sceneStatus"),report:$("finalReport")};
let current=0,completed=new Set(),mistakes=[],startedAt=Date.now(),rubTimer=null,dryDone=false,tapDone=false,scene=null,sceneObjects={};
const equipment=["Liquid or bar soap","Paper towels","Orangewood stick","Lotion"];
const pickedEquipment=new Set();
function feedback(message,type=""){ui.feedback.textContent=message;ui.feedback.className="hh-feedback"+(type?" "+type:"");}
function status(message){ui.status.lastChild.textContent=" "+message;}
function button(label,fn,kind=""){const b=document.createElement("button");b.type="button";b.className="hh-action-btn "+kind;b.textContent=label;b.addEventListener("click",fn);return b;}
function actionLabel(text){const p=document.createElement("p");p.className="hh-action-label";p.textContent=text;ui.area.append(p);}
function updateProgress(){const pct=Math.round(completed.size/steps.length*100);ui.bar.style.width=pct+"%";ui.percent.textContent=pct+"%";ui.label.textContent="الخطوة "+(current+1)+" من "+steps.length;ui.sub.textContent=steps[current].description;ui.counter.textContent=String(current+1).padStart(2,"0")+" / "+steps.length;ui.dots.replaceChildren();steps.forEach((s,i)=>{const d=document.createElement("button");d.type="button";d.className=(completed.has(i)?"done ":"")+(i===current?"active":"");d.title="الخطوة "+(i+1);d.setAttribute("aria-label",d.title);d.addEventListener("click",()=>{if(i<=current||completed.has(i)){current=i;renderStep();}});ui.dots.append(d);});ui.prev.disabled=current===0;ui.next.disabled=!completed.has(current);ui.next.textContent=current===steps.length-1?"عرض التقرير ←":"الخطوة التالية ←";}
function complete(message="أحسنت، تم تنفيذ المهمة."){completed.add(current);feedback(message,"good");ui.next.disabled=false;updateProgress();status("تم إكمال المهمة");}
function recordMistake(message){mistakes.push({step:current+1,message});feedback(message,"warn");status("راجع المهمة");}
function selectButton(label,chosen,fn){const b=document.createElement("button");b.type="button";b.className="hh-choice"+(chosen?" selected":"");b.innerHTML='<span><span class="check">'+(chosen?"✓":"")+'</span></span>';const text=document.createElement("span");text.textContent=label;b.firstChild.append(text);b.addEventListener("click",fn);return b;}
function renderStep(){if(rubTimer){clearInterval(rubTimer);rubTimer=null;}const s=steps[current];ui.title.textContent=s.title;ui.description.textContent=s.description;ui.rationale.textContent=s.rationale;ui.area.replaceChildren();feedback(completed.has(current)?"تم إكمال هذه الخطوة. يمكنك الانتقال للخطوة التالية.":"نفّذ المهمة المطلوبة داخل المعمل.");ui.next.disabled=!completed.has(current);ui.prev.disabled=current===0;updateProgress();
 switch(s.task){
 case "equipment":{actionLabel("اختر المعدات التي جهزتها");equipment.forEach(item=>ui.area.append(selectButton(item,pickedEquipment.has(item),()=>{pickedEquipment.has(item)?pickedEquipment.delete(item):pickedEquipment.add(item);renderStep();})));ui.area.append(button("تأكيد تجهيز المعدات",()=>{if(pickedEquipment.has("Liquid or bar soap")&&pickedEquipment.has("Paper towels")&&pickedEquipment.has("Orangewood stick")&&pickedEquipment.has("Lotion")){sceneSet("tray",true);complete("تم تجهيز الصابون والمنشفة الورقية وعود Orangewood. Lotion مذكور ضمن المعدات.");}else recordMistake("تأكد من تجهيز الصابون والمنشفة الورقية وعود Orangewood كما في الجدول.");},"primary-action"));break;}
 case "stand":ui.area.append(button("قِف أمام الحوض مع إبعاد الزي عن الحوض",()=>{sceneSet("position",true);complete("تم ضبط موضع الوقوف أمام الحوض.");},"primary-action"));break;
 case "jewelry":{const b=button("إزالة المجوهرات وتأمينها",()=>{sceneSet("jewelry",false);complete("تمت إزالة المجوهرات وتأمينها.");},"primary-action");ui.area.append(b);break;}
 case "water":{actionLabel("درجة حرارة المياه");const row=document.createElement("div");row.className="hh-control-row";const sel=document.createElement("select");[["","اختر درجة الحرارة"],["cold","باردة"],["warm","دافئة"],["hot","ساخنة"]].forEach(([v,t])=>sel.add(new Option(t,v)));const flow=document.createElement("select");[["","قوة التدفق"],["gentle","مناسبة"],["strong","قوية"]].forEach(([v,t])=>flow.add(new Option(t,v)));row.append(sel,flow);ui.area.append(row,button("تشغيل المياه وضبطها",()=>{if(sel.value==="warm"&&flow.value){sceneSet("water",true);complete("تم ضبط المياه لتكون دافئة وبقوة تدفق مناسبة.");}else recordMistake("اختر مياهًا دافئة وحدد قوة التدفق؛ الكتاب يطلب ضبط الاثنين ولا يحدد قيمة رقمية للتدفق.");},"primary-action"));break;}
 case "wet":ui.area.append(button("تبليل اليدين والمعصمين",()=>{sceneSet("wet",true);complete("تم تبليل اليدين والمعصمين مع إبقائهما أسفل المرفقين.");},"primary-action"));break;
 case "soap":{actionLabel("اختر نوع الصابون");const kind=document.createElement("select");kind.add(new Option("صابون سائل من الموزع","liquid"));kind.add(new Option("صابون قطعة","bar"));const row=document.createElement("div");row.className="hh-control-row";const range=document.createElement("input");range.type="range";range.min="3";range.max="5";range.value="3";const value=document.createElement("strong");value.textContent="3 ml";range.addEventListener("input",()=>value.textContent=range.value+" ml");row.append(range,value);kind.addEventListener("change",()=>{row.hidden=kind.value==="bar";});ui.area.append(kind,row,button("وضع الصابون وتكوين الرغوة",()=>{if(kind.value==="liquid"){const amount=Number(range.value);sceneSet("soap",true);complete("تم استخدام "+amount+" ml من الصابون السائل، ضمن النطاق المذكور بالجدول.");}else{sceneSet("soap",true);complete("تم اختيار صابون القطعة وتكوين الرغوة كما ورد في الجدول.");}},"primary-action"));break;}
 case "rub":{actionLabel("فرك جميع الأسطح لمدة 30 ثانية");const timer=document.createElement("div");timer.className="hh-feedback";timer.textContent="30 ثانية";ui.area.append(timer,button("ابدأ مؤقت الفرك",()=>{let remaining=30;timer.textContent=remaining+" ثانية متبقية";const start=ui.area.querySelector("button");start.disabled=true;rubTimer=setInterval(()=>{remaining--;timer.textContent=remaining>0?remaining+" ثانية متبقية":"اكتمل وقت الفرك";if(remaining<=0){clearInterval(rubTimer);rubTimer=null;sceneSet("rub",true);complete("اكتمل مؤقت الفرك لمدة 30 ثانية كما ورد في الجدول.");}},1000);},"primary-action"));break;}
 case "nails":{actionLabel("اختر الطريقة المذكورة في الكتاب");ui.area.append(selectButton("ظفر اليد الأخرى",false,()=>{sceneSet("nails",true);complete("تم اختيار تنظيف أسفل الأظافر بظفر اليد الأخرى.");}),selectButton("عود Orangewood نظيف",false,()=>{sceneSet("nails",true);complete("تم اختيار عود Orangewood نظيف لتنظيف أسفل الأظافر.");}));break;}
 case "rinse":ui.area.append(button("شطف اليدين باتجاه أطراف الأصابع",()=>{sceneSet("rinse",true);complete("تم الشطف مع اتجاه تدفق الماء نحو أطراف الأصابع.");},"primary-action"));break;
 case "dry":ui.area.append(button("1 · تجفيف اليدين من الأصابع إلى أعلى الساعد",()=>{dryDone=true;sceneSet("dry",true);if(dryDone&&tapDone)complete("اكتمل التجفيف وإغلاق الصنبور باستخدام المنشفة كما يوضح الرسم.");else feedback("تم التجفيف. أكمل استخدام المنشفة لإغلاق الصنبور كما في الرسم التوضيحي.","good");},"primary-action"),button("2 · استخدام المنشفة لإغلاق الصنبور (كما في الرسم)",()=>{tapDone=true;sceneSet("tapOff",true);if(dryDone&&tapDone)complete("اكتمل التجفيف وإغلاق الصنبور باستخدام المنشفة كما يوضح الرسم.");else feedback("تم إغلاق الصنبور بالمنشفة. أكمل تجفيف اليدين والتخلص من المنشفة.","good");},""));break;
 }
}
function sceneSet(key,value){if(!scene)return;const o=sceneObjects;if(key==="water"){o.water.visible=value;o.flow.visible=value;}if(key==="wet"){o.hands.traverse(n=>{if(n.material?.color)n.material.color.set("#b6d9e9");});o.droplets.visible=true;}if(key==="soap"){o.foam.visible=true;}if(key==="rub"){o.hands.rotation.z=.12;o.foam.visible=true;}if(key==="rinse"){o.flow.visible=true;o.foam.visible=false;o.droplets.visible=true;}if(key==="dry"){o.towel.visible=true;o.droplets.visible=false;o.hands.traverse(n=>{if(n.material?.color)n.material.color.set("#e9bda2");});}if(key==="tapOff"){o.flow.visible=false;}if(key==="nails"&&o.nailTool)o.nailTool.visible=true;if(key==="jewelry")o.ring.visible=value;if(key==="tray")o.tray.visible=value;if(key==="position")o.hands.position.y=.12;}
function finish(){const seconds=Math.round((Date.now()-startedAt)/1000);$("finalScore").textContent=Math.round(completed.size/steps.length*100)+"%";$("finalTime").textContent=Math.floor(seconds/60)+"m "+String(seconds%60).padStart(2,"0")+"s";$("finalTasks").textContent=completed.size+"/"+steps.length;$("reportList").replaceChildren();steps.forEach((s,i)=>{const r=document.createElement("div");r.textContent=(i+1)+". "+s.title;const tag=document.createElement("span");tag.textContent=completed.has(i)?"مكتملة":"غير مكتملة";r.append(tag);$("reportList").append(r);});ui.report.hidden=false;ui.report.scrollIntoView({behavior:"smooth",block:"start"});ui.next.disabled=true;$( "submitResult").disabled=completed.size!==steps.length;}
async function waitForStudent(auth,onAuthStateChanged){if(auth.currentUser)return auth.currentUser;return new Promise((resolve,reject)=>{let unsubscribe=()=>{};const timer=setTimeout(()=>{unsubscribe();reject(new Error("AUTH_TIMEOUT"));},12000);unsubscribe=onAuthStateChanged(auth,user=>{if(user){clearTimeout(timer);unsubscribe();resolve(user);}});});}
$("submitResult").addEventListener("click",async()=>{
 const button=$("submitResult"),statusBox=$("submissionStatus");
 if(completed.size!==steps.length){statusBox.textContent="أكمل جميع الخطوات أولًا.";return;}
 button.disabled=true;statusBox.textContent="جارٍ إرسال التقرير...";
 try{
  const student=await waitForStudent(),simulationId="hand-hygiene-lesson-03",submissionRef=doc(db,"simulationSubmissions",simulationId+"_"+student.uid);
  const existing=await getDoc(submissionRef);
  if(existing.exists()){statusBox.textContent=existing.data().status==="approved"?"تم اعتماد هذه المحاكاة بالفعل.":"سبق إرسال هذه المحاكاة وهي "+(existing.data().status==="pending"?"بانتظار مراجعة الإدارة.":"مرفوضة؛ تواصل مع الإدارة.");return;}
  await setDoc(submissionRef,{uid:student.uid,simulationId,lessonId:"fundamentals-lesson-03",completedSteps:completed.size,totalSteps:steps.length,score:Math.round(completed.size/steps.length*100),elapsedSeconds:Math.round((Date.now()-startedAt)/1000),mistakes:mistakes.slice(0,30),status:"pending",xpAwarded:0,createdAt:serverTimestamp()});
  statusBox.textContent="تم إرسال تقريرك بنجاح. سيظهر XP بعد مراجعة الإدارة واعتماد النتيجة.";
 }catch(error){console.error("Simulation submission failed:",error);statusBox.textContent=error.message==="AUTH_TIMEOUT"?"انتهت مهلة التحقق من الحساب. سجّل الدخول ثم أعد المحاولة.":"تعذر إرسال التقرير. تأكد من تسجيل الدخول ونشر قواعد Firestore الجديدة.";}
 finally{button.disabled=false;}
});
ui.next.addEventListener("click",()=>{if(!completed.has(current))return;if(current===steps.length-1){finish();return;}current++;renderStep();});ui.prev.addEventListener("click",()=>{if(current>0){current--;renderStep();}});$("restartSimulation").addEventListener("click",()=>location.reload());

async function buildScene(){const host=$("threeScene");try{const THREE=await import("three");const {OrbitControls}=await import("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js");const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.setSize(host.clientWidth,host.clientHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.append(renderer.domElement);const scene3=new THREE.Scene();scene3.background=new THREE.Color("#eaf5fc");const camera=new THREE.PerspectiveCamera(36,host.clientWidth/host.clientHeight,.1,100);camera.position.set(5.4,4.1,7.4);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.set(0,1.3,0);controls.minDistance=5;controls.maxDistance=11;controls.maxPolarAngle=Math.PI*.48;controls.minPolarAngle=.28;
 scene3.add(new THREE.HemisphereLight(0xffffff,0x8da8bd,2));const key=new THREE.DirectionalLight(0xffffff,2.2);key.position.set(4,8,5);key.castShadow=true;scene3.add(key);const fill=new THREE.DirectionalLight(0x9edcff,.8);fill.position.set(-5,3,-3);scene3.add(fill);
 const mat=(color,roughness=.7,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});const floor=new THREE.Mesh(new THREE.PlaneGeometry(14,14),mat("#e5eff6"));floor.rotation.x=-Math.PI/2;floor.position.y=0;floor.receiveShadow=true;scene3.add(floor);
 const counter=new THREE.Mesh(new THREE.BoxGeometry(6,.28,1.5),mat("#dce8f0"));counter.position.set(0,1.65,-.1);counter.castShadow=true;counter.receiveShadow=true;scene3.add(counter);
 const basin=new THREE.Mesh(new THREE.BoxGeometry(2.5,.12,1.05),mat("#9db8ca",.25,.35));basin.position.set(0,1.47,.25);scene3.add(basin);const inner=new THREE.Mesh(new THREE.BoxGeometry(2.15,.08,.78),mat("#c5e7f3",.2,.2));inner.position.set(0,1.54,.25);scene3.add(inner);
 const faucet=new THREE.Group();const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.9,20),mat("#91a8b8",.25,.8));pipe.position.set(0,2.12,-.53);faucet.add(pipe);const spout=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.62,20),mat("#91a8b8",.25,.8));spout.rotation.z=Math.PI/2;spout.position.set(.27,2.52,-.53);faucet.add(spout);const tip=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.13,20),mat("#6e8fa4",.25,.7));tip.position.set(.58,2.52,-.53);faucet.add(tip);scene3.add(faucet);
 const dispenser=new THREE.Group();const bottle=new THREE.Mesh(new THREE.BoxGeometry(.42,.75,.3),mat("#6dbed0",.3));bottle.position.set(-1.7,2.2,-.55);dispenser.add(bottle);const pump=new THREE.Mesh(new THREE.BoxGeometry(.38,.09,.13),mat("#69869a",.3));pump.position.set(-1.7,2.63,-.55);dispenser.add(pump);scene3.add(dispenser);
 const towel=new THREE.Mesh(new THREE.BoxGeometry(.5,.65,.08),mat("#fff",.95));towel.position.set(1.7,2.05,-.55);scene3.add(towel);
 const palm=new THREE.Mesh(new THREE.BoxGeometry(.95,.17,.55),mat("#e9bda2"));palm.position.set(0,1.9,.75);scene3.add(palm);const fingers=new THREE.Group();for(let i=0;i<4;i++){const f=new THREE.Mesh(new THREE.CapsuleGeometry(.075,.42,4,8),mat("#e9bda2"));f.rotation.z=.06;f.position.set(-.34+i*.22,1.94,1.12);fingers.add(f);}scene3.add(fingers);const thumb=new THREE.Mesh(new THREE.CapsuleGeometry(.08,.3,4,8),mat("#e9bda2"));thumb.rotation.x=Math.PI/2;thumb.rotation.z=-.7;thumb.position.set(-.57,1.9,.87);scene3.add(thumb);
 const hand2=new THREE.Mesh(new THREE.BoxGeometry(.95,.15,.52),mat("#e9bda2"));hand2.position.set(.55,2.12,1.25);hand2.rotation.z=.18;scene3.add(hand2);
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.11,.025,8,24),mat("#d5aa4b",.25,.8));ring.position.set(.3,2.22,1.12);scene3.add(ring);
 const flow=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.72,12),new THREE.MeshBasicMaterial({color:"#54c8f2",transparent:true,opacity:.8}));flow.position.set(.58,2.12,-.22);flow.visible=false;scene3.add(flow);
 const droplets=new THREE.Group();for(let i=0;i<14;i++){const d=new THREE.Mesh(new THREE.SphereGeometry(.035,8,8),new THREE.MeshBasicMaterial({color:"#5fc9f1"}));d.position.set((Math.random()-.5)*1.2,1.6+Math.random()*.5,.3+Math.random()*.7);droplets.add(d);}droplets.visible=false;scene3.add(droplets);
 const foam=new THREE.Group();for(let i=0;i<9;i++){const f=new THREE.Mesh(new THREE.SphereGeometry(.09+Math.random()*.04,12,12),mat("#f8ffff",.25));f.position.set((Math.random()-.5)*.7,2.04,.9+Math.random()*.25);foam.add(f);}foam.visible=false;scene3.add(foam);
 const tray=new THREE.Mesh(new THREE.BoxGeometry(1.1,.08,.5),mat("#d5e2ec"));tray.position.set(-2.2,1.82,.55);tray.visible=false;scene3.add(tray);
 const nailTool=new THREE.Mesh(new THREE.CylinderGeometry(.025,.045,.72,10),mat("#bd8b57"));nailTool.position.set(-.95,1.95,.95);nailTool.rotation.z=Math.PI/2.8;nailTool.visible=false;scene3.add(nailTool);
 sceneObjects={hands:new THREE.Group(),ring,water:flow,flow,droplets,foam,towel,tray,nailTool};sceneObjects.hands.add(palm,fingers,thumb,hand2);scene3.add(sceneObjects.hands);scene={renderer,scene3,camera,controls};scene.controls=controls;const reset=()=>{camera.position.set(5.4,4.1,7.4);controls.target.set(0,1.3,0);controls.update();};$("resetView").addEventListener("click",reset);
  const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);};new ResizeObserver(resize).observe(host);const clock=new THREE.Clock();function animate(){requestAnimationFrame(animate);const t=clock.getElapsedTime();if(droplets.visible)droplets.children.forEach((d,i)=>{d.position.y=1.55+((t*.7+i*.13)%0.6);});controls.update();renderer.render(scene3,camera);}animate();}catch(error){console.warn("3D scene unavailable",error);$("sceneFallback").hidden=false;host.hidden=true;}}
buildScene();renderStep();
const cameraActions={left:()=>scene?.controls.rotateLeft(Math.PI/12),right:()=>scene?.controls.rotateLeft(-Math.PI/12),up:()=>scene?.controls.rotateUp(Math.PI/14),down:()=>scene?.controls.rotateUp(-Math.PI/14),in:()=>scene?.controls.dollyIn(1.18),out:()=>scene?.controls.dollyOut(1.18)};
document.querySelectorAll("[data-camera]").forEach(control=>control.addEventListener("click",()=>{if(!scene){setHint("المجسم ثلاثي الأبعاد لم يكتمل تحميله بعد.");return;}cameraActions[control.dataset.camera]?.();scene.controls.update();}));

document.querySelectorAll("[data-camera]").forEach(control=>control.addEventListener("click",()=>{if(!scene){setHint("المجسم ثلاثي الأبعاد لم يكتمل تحميله بعد. أعد تحميل الصفحة.");return;}cameraActions[control.dataset.camera]?.();scene.controls.update();}));

/* Student-driven station interactions: tap a 3D station hotspot, then use the matching virtual tool. */
const hint=$("interactionHint");
let selectedTool=null;
function setHint(message){if(hint)hint.textContent=message;}
function chooseTool(name,el){
 selectedTool=name;
 document.querySelectorAll("[data-tool]").forEach(x=>x.classList.toggle("selected",x===el));
 setHint("الأداة المختارة: "+name+" — المس العنصر المناسب داخل المحطة");
 if(current===0){pickedEquipment.add(name);renderStep();}
}
document.querySelectorAll("[data-tool]").forEach(el=>el.addEventListener("click",()=>chooseTool(el.dataset.tool,el)));
function stationAction(target){
 const task=steps[current].task;
 if(task==="equipment"&&target==="tray"){
  if(pickedEquipment.has("Liquid or bar soap")&&pickedEquipment.has("Paper towels")&&pickedEquipment.has("Orangewood stick")&&pickedEquipment.has("Lotion")){sceneSet("tray",true);complete("وضعت الأدوات المطلوبة على صينية التجهيز.");}
  else recordMistake("اختر الصابون والمنشفة الورقية وعود Orangewood وLotion من رف الأدوات أولًا.");
 }else if(task==="stand"&&target==="hands"){sceneSet("position",true);complete("تم اتخاذ موضع الوقوف أمام الحوض.");}
 else if(task==="jewelry"&&target==="hands"){sceneSet("jewelry",false);complete("تمت إزالة المجوهرات وتأمينها.");}
 else if(task==="water"&&target==="faucet"){sceneSet("water",true);complete("تم تشغيل المياه. أكمل ضبط درجة الحرارة وقوة التدفق من لوحة المهمة.");}
 else if(task==="wet"&&target==="hands"){sceneSet("wet",true);complete("تم تبليل اليدين والمعصمين.");}
 else if(task==="soap"&&target==="soap"){
  if(selectedTool==="Liquid or bar soap"||selectedTool==="Soap"){sceneSet("soap",true);const apply=ui.area.querySelector(".primary-action");if(apply)apply.click();else feedback("تم وضع الصابون. أكّد النوع والكمية من لوحة المهمة.","good");}
  else recordMistake("اختر الصابون من رف الأدوات أولًا، ثم المس موزع الصابون.");
 }else if(task==="rub"&&target==="hands"){
  const start=ui.area.querySelector("button");
  if(start&&!start.disabled)start.click();
  else feedback("مؤقت الفرك يعمل أو اكتمل بالفعل.","good");
 }else if(task==="nails"&&target==="nails"){
  if(selectedTool==="Orangewood stick"){sceneSet("nails",true);complete("استخدمت عود Orangewood لتنظيف أسفل الأظافر.");}
  else recordMistake("اختر عود Orangewood من رف الأدوات أولًا.");
 }else if(task==="rinse"&&target==="faucet"){sceneSet("rinse",true);complete("تم شطف اليدين باتجاه أطراف الأصابع.");}
 else if(task==="dry"&&target==="towel"){
  if(selectedTool==="Paper towels"){const b=ui.area.querySelector("button");if(b)b.click();else{dryDone=true;sceneSet("dry",true);feedback("تم التجفيف. أكمل إغلاق الصنبور بالمنشفة.","good");}}
  else recordMistake("اختر المنشفة الورقية من رف الأدوات أولًا.");
 }else if(task==="dry"&&target==="faucet"){
  const buttons=ui.area.querySelectorAll("button");
  if(buttons.length>1)buttons[1].click();else{tapDone=true;sceneSet("tapOff",true);if(dryDone)complete("اكتمل التجفيف وإغلاق الصنبور.");}
 }else feedback("هذا العنصر غير مطلوب في الخطوة الحالية. راجع المهمة المحددة.","warn");
}
document.querySelectorAll("[data-hotspot]").forEach(el=>el.addEventListener("click",()=>stationAction(el.dataset.hotspot)));
