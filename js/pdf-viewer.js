import * as pdfjsLib from "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs";
pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs";
const params=new URLSearchParams(location.search);
const file=params.get("file");
const title=params.get("title")||"ملف تعليمي";
const titleNode=document.getElementById("docTitle");
const status=document.getElementById("status");
const pagesNode=document.getElementById("pages");
const info=document.getElementById("pageInfo");
titleNode.textContent=title;
let pdf=null,current=1,scale=1.35,rendering=false;
const canvases=[];
function updateControls(){info.textContent=pdf?current+" / "+pdf.numPages:"—";document.getElementById("prev").disabled=current<=1;document.getElementById("next").disabled=!pdf||current>=pdf.numPages;}
async function renderPage(n){
 if(!pdf||rendering)return;
 rendering=true;current=n;updateControls();status.hidden=true;
 try{
  const page=await pdf.getPage(n),viewport=page.getViewport({scale});
  let canvas=canvases[n-1];
  if(!canvas){canvas=document.createElement("canvas");canvas.className="page";canvases[n-1]=canvas;pagesNode.append(canvas);}
  const context=canvas.getContext("2d");canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  await page.render({canvasContext:context,viewport}).promise;
  canvas.scrollIntoView({behavior:"smooth",block:"start"});
 }catch(e){showError("تعذر عرض الصفحة: "+e.message);}
 finally{rendering=false;updateControls();}
}
function showError(message){status.hidden=false;status.className="error";status.textContent=message;}
if(!file){showError("لم يتم تحديد رابط ملف PDF.");}
else{
 try{
  const task=pdfjsLib.getDocument({url:file,withCredentials:false});
  pdf=await task.promise;
  status.hidden=true;
  for(let n=1;n<=pdf.numPages;n++){
   const page=await pdf.getPage(n),viewport=page.getViewport({scale:scale});
   const canvas=document.createElement("canvas");canvas.className="page";canvas.dataset.page=String(n);
   canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   pagesNode.append(canvas);canvases[n-1]=canvas;
   await page.render({canvasContext:canvas.getContext("2d"),viewport}).promise;
  }
  current=1;updateControls();
 }catch(e){showError("لم نتمكن من فتح الملف. قد يكون رابط الملف غير متاح أو يمنع المتصفح الوصول إليه. التفاصيل: "+e.message);}
}
document.getElementById("prev").addEventListener("click",()=>{if(current>1)renderPage(current-1);});
document.getElementById("next").addEventListener("click",()=>{if(pdf&&current<pdf.numPages)renderPage(current+1);});
document.getElementById("zoomIn").addEventListener("click",()=>{if(!pdf)return;scale=Math.min(2.5,scale+.15);rerenderAll();});
document.getElementById("zoomOut").addEventListener("click",()=>{if(!pdf)return;scale=Math.max(.6,scale-.15);rerenderAll();});
async function rerenderAll(){
 if(rendering)return;rendering=true;
 try{for(let n=1;n<=pdf.numPages;n++){const page=await pdf.getPage(n),viewport=page.getViewport({scale});const canvas=canvases[n-1];canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);await page.render({canvasContext:canvas.getContext("2d"),viewport}).promise;}}
 catch(e){showError("تعذر تغيير حجم العرض: "+e.message);}
 finally{rendering=false;updateControls();}
}