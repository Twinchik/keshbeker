// Кешбекер — Обработка фото карты.
// Файлы из js/ подключаются в index.html по порядку и делят общие переменные.

/* ---------- обработка фото карты ---------- */
// Шаги: выровнять по углам (перспектива) → убрать цветной оттенок и блики → сгладить пятна.
// Режим «Цвета карты» строит чистую карту из основных цветов фото.
const CARD_W=800, CARD_H=Math.round(800/1.586);

async function loadBitmap(file){
  let src;
  try{ src=await createImageBitmap(file,{imageOrientation:"from-image"}); }
  catch{ src=await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=URL.createObjectURL(file); }); }
  const sw=src.width, sh=src.height; if(!sw||!sh) throw new Error("empty");
  const k=Math.min(1,1600/Math.max(sw,sh));
  const cv=document.createElement("canvas"); cv.width=Math.round(sw*k); cv.height=Math.round(sh*k);
  cv.getContext("2d").drawImage(src,0,0,cv.width,cv.height);
  return cv;
}
function rotateCanvas(cv){
  const r=document.createElement("canvas"); r.width=cv.height; r.height=cv.width;
  const g=r.getContext("2d"); g.translate(r.width,0); g.rotate(Math.PI/2); g.drawImage(cv,0,0); return r;
}
// Ищем карту: пиксели, заметно отличающиеся от цвета краёв фото, самое крупное пятно → 4 крайние точки
function detectCorners(cv){
  const S=160, k=S/Math.max(cv.width,cv.height), w=Math.max(8,Math.round(cv.width*k)), h=Math.max(8,Math.round(cv.height*k));
  const t=document.createElement("canvas"); t.width=w; t.height=h; const g=t.getContext("2d"); g.drawImage(cv,0,0,w,h);
  const d=g.getImageData(0,0,w,h).data;
  let br=0,bg=0,bb=0,n=0;
  for(let x=0;x<w;x++) for(const y of [0,1,h-2,h-1]){ const i=(y*w+x)*4; br+=d[i]; bg+=d[i+1]; bb+=d[i+2]; n++; }
  for(let y=0;y<h;y++) for(const x of [0,1,w-2,w-1]){ const i=(y*w+x)*4; br+=d[i]; bg+=d[i+1]; bb+=d[i+2]; n++; }
  br/=n; bg/=n; bb/=n;
  const m=new Uint8Array(w*h);
  for(let p=0;p<w*h;p++){ const i=p*4; const dist=Math.abs(d[i]-br)+Math.abs(d[i+1]-bg)+Math.abs(d[i+2]-bb); m[p]=dist>70?1:0; }
  const lab=new Int32Array(w*h).fill(-1); let best=null;
  for(let p=0;p<w*h;p++){ if(!m[p]||lab[p]>=0) continue;
    const st=[p]; lab[p]=p; const pts=[];
    while(st.length){ const q=st.pop(); pts.push(q); const x=q%w, y=(q/w)|0;
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const nx=x+dx, ny=y+dy; if(nx<0||ny<0||nx>=w||ny>=h) continue; const r=ny*w+nx; if(m[r]&&lab[r]<0){ lab[r]=p; st.push(r); } } }
    if(!best||pts.length>best.length) best=pts; }
  const fallback=()=>{ const ix=cv.width*.04, iy=cv.height*.04; return [[ix,iy],[cv.width-ix,iy],[cv.width-ix,cv.height-iy],[ix,cv.height-iy]]; };
  if(!best || best.length<w*h*.12 || best.length>w*h*.95) return fallback();
  let tl,tr,brc,bl; let a=1e9,b=-1e9,c=-1e9,e=1e9;
  for(const q of best){ const x=q%w, y=(q/w)|0;
    if(x+y<a){a=x+y;tl=[x,y];} if(x-y>b){b=x-y;tr=[x,y];} if(x+y>c){c=x+y;brc=[x,y];} if(x-y<e){e=x-y;bl=[x,y];} }
  const sc=1/k; return [tl,tr,brc,bl].map(([x,y])=>[x*sc,y*sc]);
}
// Гомография: из прямоугольника карты в четырёхугольник на фото
function homography(src, dst){
  const A=[], B=[];
  for(let i=0;i<4;i++){ const [x,y]=src[i], [u,v]=dst[i];
    A.push([x,y,1,0,0,0,-u*x,-u*y]); B.push(u);
    A.push([0,0,0,x,y,1,-v*x,-v*y]); B.push(v); }
  for(let i=0;i<8;i++){ let mx=i; for(let r=i+1;r<8;r++) if(Math.abs(A[r][i])>Math.abs(A[mx][i])) mx=r;
    [A[i],A[mx]]=[A[mx],A[i]]; [B[i],B[mx]]=[B[mx],B[i]];
    for(let r=0;r<8;r++){ if(r===i) continue; const f=A[r][i]/A[i][i]; for(let c=i;c<8;c++) A[r][c]-=f*A[i][c]; B[r]-=f*B[i]; } }
  const h=B.map((b,i)=>b/A[i][i]); return [...h,1];
}
function warpCard(cv, corners){
  const W=CARD_W, H=CARD_H;
  const Hm=homography([[0,0],[W,0],[W,H],[0,H]], corners);
  const sd=cv.getContext("2d").getImageData(0,0,cv.width,cv.height), s=sd.data, sw=cv.width, sh=cv.height;
  const out=new ImageData(W,H), o=out.data;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const z=Hm[6]*x+Hm[7]*y+1, u=(Hm[0]*x+Hm[1]*y+Hm[2])/z, v=(Hm[3]*x+Hm[4]*y+Hm[5])/z;
    const x0=Math.max(0,Math.min(sw-2,Math.floor(u))), y0=Math.max(0,Math.min(sh-2,Math.floor(v))), fx=Math.max(0,Math.min(1,u-x0)), fy=Math.max(0,Math.min(1,v-y0));
    const i00=(y0*sw+x0)*4, i10=i00+4, i01=i00+sw*4, i11=i01+4, j=(y*W+x)*4;
    for(let c=0;c<3;c++) o[j+c]=(s[i00+c]*(1-fx)+s[i10+c]*fx)*(1-fy)+(s[i01+c]*(1-fx)+s[i11+c]*fx)*fy;
    o[j+3]=255;
  }
  return out;
}
// мин/макс-фильтр (раздельный): основа «открытия/закрытия», убирает пылинки и точки меньше окна
function minmax(src, W, H, r, isMax){
  const tmp=new Uint8ClampedArray(src.length), out=new Uint8ClampedArray(src.length);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++) for(let c=0;c<3;c++){ let v=isMax?0:255;
    for(let k=-r;k<=r;k++){ const xx=Math.min(W-1,Math.max(0,x+k)); const t=src[(y*W+xx)*4+c]; v=isMax?(t>v?t:v):(t<v?t:v); } tmp[(y*W+x)*4+c]=v; }
  for(let y=0;y<H;y++) for(let x=0;x<W;x++) for(let c=0;c<3;c++){ let v=isMax?0:255;
    for(let k=-r;k<=r;k++){ const yy=Math.min(H-1,Math.max(0,y+k)); const t=tmp[(yy*W+x)*4+c]; v=isMax?(t>v?t:v):(t<v?t:v); } out[(y*W+x)*4+c]=v; }
  for(let i=3;i<out.length;i+=4) out[i]=255;
  return out;
}
function despeckle(img, r){
  const {width:W,height:H}=img; let d=img.data;
  d=minmax(minmax(d,W,H,r,false),W,H,r,true);   // открытие: убирает светлые точки
  d=minmax(minmax(d,W,H,r,true),W,H,r,false);   // закрытие: убирает тёмные точки
  return new ImageData(d,W,H);
}
// выравнивание освещения: сглаженная карта яркости по блокам, блики приглушаются, тени подтягиваются
function flattenLight(img, strength){
  const {width:W,height:H,data:d}=img, B=12, gw=Math.ceil(W/B), gh=Math.ceil(H/B);
  let grid=new Float32Array(gw*gh*3);
  for(let gy=0;gy<gh;gy++) for(let gx=0;gx<gw;gx++){ let s0=0,s1=0,s2=0,n=0;
    for(let y=gy*B;y<Math.min(H,gy*B+B);y+=2) for(let x=gx*B;x<Math.min(W,gx*B+B);x+=2){ const i=(y*W+x)*4; s0+=d[i]; s1+=d[i+1]; s2+=d[i+2]; n++; }
    const g=(gy*gw+gx)*3; grid[g]=s0/n; grid[g+1]=s1/n; grid[g+2]=s2/n; }
  for(let pass=0;pass<1;pass++){ const ng=new Float32Array(grid.length);
    for(let gy=0;gy<gh;gy++) for(let gx=0;gx<gw;gx++) for(let c=0;c<3;c++){ let s=0,n=0;
      for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ const yy=gy+dy, xx=gx+dx; if(yy<0||xx<0||yy>=gh||xx>=gw) continue; s+=grid[(yy*gw+xx)*3+c]; n++; }
      ng[(gy*gw+gx)*3+c]=s/n; } grid=ng; }
  const med=[0,1,2].map(c=>{ const v=[]; for(let i=c;i<grid.length;i+=3) v.push(grid[i]); v.sort((a,b)=>a-b); return v[v.length>>1]; });
  for(let y=0;y<H;y++){ const fy=Math.min(gh-1.001,Math.max(0,y/B-.5)), y0=fy|0, ty=fy-y0;
    for(let x=0;x<W;x++){ const fx=Math.min(gw-1.001,Math.max(0,x/B-.5)), x0=fx|0, tx=fx-x0, i=(y*W+x)*4;
      for(let c=0;c<3;c++){
        const g=(yy,xx)=>grid[(yy*gw+xx)*3+c];
        const ill=(g(y0,x0)*(1-tx)+g(y0,x0+1)*tx)*(1-ty)+(g(y0+1,x0)*(1-tx)+g(y0+1,x0+1)*tx)*ty;
        let f=(med[c]+4)/(ill+4); f=Math.max(.15,Math.min(2.2,f));
        const k = f<1 ? strength : strength*.5;       // блики гасим сильнее, чем подтягиваем тени
        d[i+c]=d[i+c]*(1+(f-1)*k); } } }
  return img;
}
function enhance(img, level){
  const d=img.data, n=d.length/4;
  // 1) баланс белого (серый мир) по средним тонам
  let sr=0,sg=0,sb=0,cnt=0;
  for(let i=0;i<d.length;i+=4){ const l=(d[i]+d[i+1]+d[i+2])/3; if(l>30&&l<225){ sr+=d[i]; sg+=d[i+1]; sb+=d[i+2]; cnt++; } }
  if(cnt>n*.05){ const m=(sr+sg+sb)/3/cnt, fr=Math.max(.8,Math.min(1.25,m/(sr/cnt))), fg=Math.max(.8,Math.min(1.25,m/(sg/cnt))), fb=Math.max(.8,Math.min(1.25,m/(sb/cnt)));
    for(let i=0;i<d.length;i+=4){ d[i]*=fr; d[i+1]*=fg; d[i+2]*=fb; } }
  // 2) блики и неровный свет
  if(level>=1) img=flattenLight(img, level===2?.95:.7);
  // 3) пылинки и точки
  if(level>=1) img=despeckle(img, level===2?2:1);
  // 4) автоуровни по яркости (1% и 99%) и немного насыщенности
  const e=img.data;
  const hist=new Uint32Array(256); for(let i=0;i<e.length;i+=4) hist[Math.min(255,(e[i]*.3+e[i+1]*.59+e[i+2]*.11)|0)]++;
  let lo=0,hi=255,acc=0; for(;lo<255;lo++){ acc+=hist[lo]; if(acc>n*.005) break; } acc=0; for(;hi>0;hi--){ acc+=hist[hi]; if(acc>n*.005) break; }
  // тёмную карту не высветляем: усиление не больше 1.25
  const span=Math.max(255/1.25,hi-lo);
  for(let i=0;i<e.length;i+=4){
    let r=(e[i]-lo)*255/span, g=(e[i+1]-lo)*255/span, b=(e[i+2]-lo)*255/span;
    const avg=(r+g+b)/3, sat=1.1; e[i]=avg+(r-avg)*sat; e[i+1]=avg+(g-avg)*sat; e[i+2]=avg+(b-avg)*sat; }
  return img;
}
// Основные цвета карты (k-средних по уменьшенной копии)
function cardColors(img){
  const {width:W,height:H,data:d}=img, pts=[];
  for(let y=4;y<H;y+=12) for(let x=4;x<W;x+=12){ const i=(y*W+x)*4; pts.push([d[i],d[i+1],d[i+2]]); }
  let cs=[pts[0],pts[(pts.length/2)|0],pts[pts.length-1]].map(p=>[...p]);
  let groups=[];
  for(let it=0;it<8;it++){ groups=cs.map(()=>[]);
    for(const p of pts){ let bi=0,bd=1e9; cs.forEach((c,ci)=>{ const dd=(p[0]-c[0])**2+(p[1]-c[1])**2+(p[2]-c[2])**2; if(dd<bd){bd=dd;bi=ci;} }); groups[bi].push(p); }
    cs=groups.map((g,gi)=>g.length?[0,1,2].map(k=>g.reduce((s,p)=>s+p[k],0)/g.length):cs[gi]); }
  const ranked=cs.map((c,i)=>({c,n:groups[i].length})).sort((a,b)=>b.n-a.n);
  const main=ranked[0].c, second=(ranked[1]&&ranked[1].n>pts.length*.12?ranked[1].c:main);
  const hex=c=>"#"+c.map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,"0")).join("");
  const shade=(c,f)=>c.map(v=>v*f);
  const lum=c=>(c[0]*.299+c[1]*.587+c[2]*.114)/255;
  const a=main, b=second===main?shade(main,.8):second;
  const ink=lum(a)>.62?"#1b2233":"#ffffff";
  return {bg:`linear-gradient(135deg,${hex(a)},${hex(b)})`, ink};
}
function toJpeg(img){
  const cv=document.createElement("canvas"); cv.width=img.width; cv.height=img.height; cv.getContext("2d").putImageData(img,0,0);
  let q=.82, out=cv.toDataURL("image/jpeg",q);
  while(out.length>160000 && q>.45){ q-=.08; out=cv.toDataURL("image/jpeg",q); }
  return out;
}

// Окно обработки. Возвращает {photo} или {custom:{bg,ink}} или null (отмена)
function openPhotoEditor(file){
  return new Promise(async resolve=>{
    let cv;
    try{ cv=await loadBitmap(file); }catch{ toast("Не получилось открыть фото. Попробуй другое."); return resolve(null); }
    let corners=detectCorners(cv), level=1, mode="photo", busy=0, result=null;
    const s=document.createElement("div"); s.className="scrim"; s.id="phScrim"; s.style.zIndex=700;
    s.innerHTML=`<div class="sheet pe" role="dialog" aria-modal="true" aria-label="Обработка фото">
      <h3>Обработка фото</h3>
      <p class="note" style="margin:0">Перетащи кружки на углы карты — фото выровняется. Потом выбери вид.</p>
      <div class="pe-stage" id="peStage"><canvas id="peSrc"></canvas><svg id="peQuad"></svg>${[0,1,2,3].map(i=>`<button type="button" class="pe-h" data-h="${i}" aria-label="Угол ${i+1}"></button>`).join("")}</div>
      <div class="pe-row"><button type="button" class="btn" id="peRot">↻ Повернуть</button><button type="button" class="btn ghost" id="peAuto">Найти карту заново</button></div>
      <div class="fl"><span class="lab">Вид</span><div class="seg" id="peMode"><button type="button" data-m="photo" aria-selected="true">Фото</button><button type="button" data-m="colors" aria-selected="false">Цвета карты</button></div></div>
      <div class="fl" id="peLevelBox"><span class="lab">Убрать блики и грязь</span><div class="seg three" id="peLevel"><button type="button" data-l="0" aria-selected="false">Нет</button><button type="button" data-l="1" aria-selected="true">Мягко</button><button type="button" data-l="2" aria-selected="false">Сильно</button></div></div>
      <div class="fl"><span class="lab">Так карта будет выглядеть</span><div class="pe-prev" id="pePrev"><span class="pe-wait">Обрабатываю…</span></div></div>
      <div class="acts"><div></div><div><button type="button" class="btn ghost" id="peCancel">Отмена</button><button type="button" class="btn primary" id="peOk">Готово</button></div></div>
    </div>`;
    document.body.appendChild(s);
    const stage=$("#peStage"), can=$("#peSrc");
    let scale=1;
    const drawStage=()=>{
      const maxW=stage.clientWidth, maxH=Math.min(window.innerHeight*.42,420);
      scale=Math.min(maxW/cv.width, maxH/cv.height);
      can.width=Math.round(cv.width*scale); can.height=Math.round(cv.height*scale);
      can.getContext("2d").drawImage(cv,0,0,can.width,can.height);
      stage.style.height=can.height+"px"; drawHandles();
    };
    const drawHandles=()=>{
      const off=(stage.clientWidth-can.width)/2; can.style.left=off+"px";
      stage.querySelectorAll(".pe-h").forEach((h,i)=>{ h.style.left=(off+corners[i][0]*scale)+"px"; h.style.top=(corners[i][1]*scale)+"px"; });
      const q=$("#peQuad"); q.setAttribute("width",stage.clientWidth); q.setAttribute("height",can.height);
      q.innerHTML=`<polygon points="${corners.map(([x,y])=>(off+x*scale)+","+(y*scale)).join(" ")}" />`;
    };
    const update=()=>{
      const my=++busy; $("#pePrev").classList.add("loading");
      setTimeout(()=>{ if(my!==busy) return;
        let img=warpCard(cv,corners);
        if(mode==="colors"){ const c=cardColors(enhance(img,0)); result={custom:c};
          $("#pePrev").setAttribute("style",`--c-bg:${c.bg};--c-ink:${c.ink};--c-sheen:radial-gradient(90% 120% at 110% -10%,rgba(255,255,255,.18),transparent 60%)`); $("#pePrev").classList.remove("photo"); }
        else { img=enhance(img,level); const url=toJpeg(img); result={photo:url};
          $("#pePrev").setAttribute("style",`--c-bg:url(${url});--c-sheen:none`); $("#pePrev").classList.add("photo"); }
        $("#pePrev").classList.remove("loading"); $("#pePrev").innerHTML="";
      },60);
    };
    requestAnimationFrame(()=>{ drawStage(); update(); });
    // перетаскивание углов
    stage.addEventListener("pointerdown",e=>{
      const h=e.target.closest(".pe-h"); if(!h) return; e.preventDefault();
      const i=+h.dataset.h; h.setPointerCapture(e.pointerId); h.classList.add("on");
      const rect=stage.getBoundingClientRect(), off=(stage.clientWidth-can.width)/2;
      const mv=ev=>{ corners[i]=[Math.max(0,Math.min(cv.width,(ev.clientX-rect.left-off)/scale)), Math.max(0,Math.min(cv.height,(ev.clientY-rect.top)/scale))]; drawHandles(); };
      const up=()=>{ h.removeEventListener("pointermove",mv); h.removeEventListener("pointerup",up); h.removeEventListener("pointercancel",up); h.classList.remove("on"); update(); };
      h.addEventListener("pointermove",mv); h.addEventListener("pointerup",up); h.addEventListener("pointercancel",up);
    });
    stage.addEventListener("touchmove",e=>e.preventDefault(),{passive:false});
    $("#peRot").onclick=()=>{ cv=rotateCanvas(cv); corners=detectCorners(cv); drawStage(); update(); };
    $("#peAuto").onclick=()=>{ corners=detectCorners(cv); drawHandles(); update(); };
    const seg=(id,attr,fn)=>$(id).onclick=e=>{ const b=e.target.closest(`[${attr}]`); if(!b) return; $(id).querySelectorAll("button").forEach(x=>x.setAttribute("aria-selected",x===b)); fn(b.getAttribute(attr)); update(); };
    seg("#peMode","data-m",m=>{ mode=m; $("#peLevelBox").hidden = m==="colors"; });
    seg("#peLevel","data-l",l=>{ level=+l; });
    const close=v=>{ s.remove(); resolve(v); };
    $("#peCancel").onclick=()=>close(null);
    $("#peOk").onclick=()=>{ if(!result) return; close(result); };
    s.addEventListener("keydown",e=>{ if(e.key==="Escape") close(null); });
  });
}
