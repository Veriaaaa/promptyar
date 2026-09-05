/* =========================================================
   پرامپت یار — منطق سایت
   (داده‌ها از prompts.js: CATS و PROMPTS)
   ========================================================= */

/* ---------- ابزارهای کمکی ---------- */
const $ = s => document.querySelector(s);
const toFa = s => String(s).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const escapeHtml = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const renderPrompt = t => escapeHtml(t).replace(/\[(.*?)\]/g, '<span class="ph" title="این قسمت را با اطلاعات خودت پر کن">[$1]</span>');
const plainText = t => t.replace(/\[(.*?)\]/g, '[$1]');
const norm = s => String(s).toLowerCase()
  .replace(/[يی]/g,'ی').replace(/[كک]/g,'ک')
  .replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/\u200c/g,' ');

const COPY_IC = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
const CHECK_IC = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const SHARE_IC = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>';

const finePointer = window.matchMedia('(pointer: fine)').matches;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const PAGE_SIZE = 9;
const state = { cat:'all', q:'', subj:'all', grade:'all', major:'all', shown: PAGE_SIZE };
let favs = loadFavs();
function loadFavs(){ try{ return JSON.parse(localStorage.getItem('py-favs'))||[]; }catch(e){ return []; } }
function saveFavs(){ try{ localStorage.setItem('py-favs', JSON.stringify(favs)); }catch(e){} }

/* ---------- وضعیت از پارامترهای URL (?cat=…&q=…) ---------- */
(function parseURLState(){
  try{
    const params = new URLSearchParams(location.search);
    const pc = params.get('cat');
    if(pc && (pc==='all' || pc==='favs' || CATS[pc])) state.cat = pc;
    const pq = params.get('q');
    if(pq){
      const si = $('#searchInput');
      if(si) si.value = pq;
      state.q = norm(pq);
    }
    const ps = params.get('subj'); if(ps && SUBJECTS[ps]) state.subj = ps;
    const pg = params.get('grade'); if(pg && GRADES[pg]) state.grade = pg;
    const pm = params.get('major'); if(pm && MAJORS[pm]) state.major = pm;
  }catch(e){}
})();

function updateURL(){
  try{
    const p = new URLSearchParams();
    if(state.cat && state.cat!=='all') p.set('cat', state.cat);
    if(state.subj && state.subj!=='all') p.set('subj', state.subj);
    if(state.grade && state.grade!=='all') p.set('grade', state.grade);
    if(state.major && state.major!=='all') p.set('major', state.major);
    const raw = ($('#searchInput')||{}).value || '';
    if(raw.trim()) p.set('q', raw.trim());
    const qs = p.toString();
    history.replaceState(null, '', qs ? ('?'+qs) : location.pathname);
  }catch(e){}
}

function setCat(cat){
  state.cat = cat;
  state.shown = PAGE_SIZE;
  document.querySelectorAll('#chips .chip').forEach(b=>b.classList.toggle('active', b.dataset.cat===cat));
  updateURL();
  applyFilter();
}

/* ---------- چیپ‌های فیلتر ---------- */
function buildChips(){
  const box = $('#chips');
  const counts = {};
  PROMPTS.forEach(p => counts[p.cat] = (counts[p.cat]||0)+1);
  let html = `<button class="chip ${state.cat==='all'?'active':''}" data-cat="all" style="--c:var(--board)">📚 همه <span class="cnt">(${toFa(PROMPTS.length)})</span></button>`;
  for(const [key,c] of Object.entries(CATS)){
    html += `<button class="chip ${state.cat===key?'active':''}" data-cat="${key}" style="--c:${c.color}">${c.icon} ${c.label} <span class="cnt">(${toFa(counts[key]||0)})</span></button>`;
  }
  html += `<button class="chip ${state.cat==='favs'?'active':''}" data-cat="favs" style="--c:var(--fav)">⭐ علاقه‌مندی‌ها <span class="cnt">(${toFa(favs.length)})</span></button>`;
  box.innerHTML = html;
}
$('#chips').addEventListener('click', e=>{
  const btn = e.target.closest('.chip'); if(!btn) return;
  setCat(btn.dataset.cat);
});

/* ---------- فیلترهای درس/پایه/رشته ---------- */
function countBy(field){
  const c = {};
  PROMPTS.forEach(p=>{ if(p[field]) c[p[field]]=(c[p[field]]||0)+1; });
  return c;
}
function dimOk(p, field, val){
  if(val==='all') return true;
  if(val==='none') return !p[field];
  return p[field]===val;
}
function buildSelects(){
  const fill = (sel, dict, field, allLabel, cur) => {
    if(!sel) return;
    const counts = countBy(field);
    const tagged = Object.values(counts).reduce((a,b)=>a+b, 0);
    let html = `<option value="all">${allLabel} (${toFa(PROMPTS.length)})</option>`;
    for(const [k,v] of Object.entries(dict)){
      html += `<option value="${k}" ${cur===k?'selected':''}>${v.icon} ${v.label} (${toFa(counts[k]||0)})</option>`;
    }
    html += `<option value="none" ${cur==='none'?'selected':''}>✨ عمومی (${toFa(PROMPTS.length - tagged)})</option>`;
    sel.innerHTML = html;
  };
  fill($('#subjSel'), SUBJECTS, 'subject', '📚 همهٔ دروس', state.subj);
  fill($('#gradeSel'), GRADES, 'grade', '🎓 همهٔ پایه‌ها', state.grade);
  fill($('#majorSel'), MAJORS, 'major', '🧭 همهٔ رشته‌ها', state.major);
}
[['#subjSel','subj'],['#gradeSel','grade'],['#majorSel','major']].forEach(([selId,key])=>{
  const sel = $(selId);
  if(!sel) return;
  sel.addEventListener('change', ()=>{
    state[key] = sel.value;
    state.shown = PAGE_SIZE;
    updateURL();
    applyFilter();
  });
});

/* ---------- رندر کارت‌ها ---------- */
function cardHTML(p, i, noAnim){
  const c = CATS[p.cat];
  const isFav = favs.includes(p.id);
  return `<article class="card3d${noAnim?'':' in'}" style="--c:${c.color};--d:${i*45}ms" data-id="${p.id}">
    <div class="card-head">
      <span class="cat-chip">${c.icon} ${c.label}</span>
      <span class="head-side">
        <button class="share-btn" data-share="${p.id}" aria-label="اشتراک‌گذاری پرامپت: ${p.title}" title="اشتراک‌گذاری">${SHARE_IC}</button>
        <button class="star-btn ${isFav?'faved':''}" data-fav="${p.id}" aria-pressed="${isFav}" title="افزودن به علاقه‌مندی‌ها">${isFav?'★':'☆'}</button>
        <span class="card-num">#${toFa(String(p.id).padStart(3,'0'))}</span>
      </span>
    </div>
    <h3>${p.title}</h3>
    <div class="prompt-text">${renderPrompt(p.text)}</div>
    <div class="card-foot">
      <div class="tags">${p.tags.map(t=>`<span>#${t}</span>`).join('')}</div>
      <button class="copy-btn" data-copy="${p.id}" aria-label="کپی متن پرامپت: ${p.title}">${COPY_IC}<span>کپی پرامپت</span></button>
    </div>
  </article>`;
}

let fullList = [];
let lastShown = 0;
function matchesFilter(p){
  if(state.cat==='favs' && !favs.includes(p.id)) return false;
  if(state.cat!=='all' && state.cat!=='favs' && p.cat!==state.cat) return false;
  if(!dimOk(p,'subject',state.subj)) return false;
  if(!dimOk(p,'grade',state.grade)) return false;
  if(!dimOk(p,'major',state.major)) return false;
  if(!state.q) return true;
  return norm(`${p.title} ${p.text} ${p.tags.join(' ')} ${CATS[p.cat].label} ${SUBJECTS[p.subject]?SUBJECTS[p.subject].label:''} ${GRADES[p.grade]?GRADES[p.grade].label:''} ${MAJORS[p.major]?MAJORS[p.major].label:''}`).includes(state.q);
}
function updateListUI(){
  const emptyEl = $('#empty');
  const isEmpty = fullList.length===0;
  emptyEl.classList.toggle('show', isEmpty);
  $('#emptyMsg').textContent = (state.cat==='favs' && !favs.length)
    ? 'هنوز پرامپتی را ستاره نکرده‌اید! روی ☆ گوشهٔ هر کارت بزنید.'
    : 'پرامپتی با این مشخصات پیدا نشد!';
  $('#resultCount').textContent = isEmpty
    ? 'بدون نتیجه'
    : `${toFa(lastShown)} از ${toFa(fullList.length)} پرامپت`;
  updateFilterToggle();
  const loadMoreBtn = $('#loadMore');
  if(lastShown < fullList.length){
    loadMoreBtn.classList.remove('hidden');
    loadMoreBtn.textContent = `بارگذاری پرامپت‌های بیشتر (${toFa(fullList.length - lastShown)} باقی‌مانده) ↓`;
  } else {
    loadMoreBtn.classList.add('hidden');
  }
}
function applyFilter(opts = {}){
  fullList = PROMPTS.filter(matchesFilter);
  const visible = fullList.slice(0, state.shown);
  $('#grid').innerHTML = visible.map((p,i)=>cardHTML(p,i,opts.noAnim)).join('');
  lastShown = visible.length;
  updateListUI();
  bindTilts();
}
/* بارگذاری بیشتر: فقط کارت‌های جدید اضافه می‌شوند تا لیست موقع اسکرول به‌هم نریزد */
function loadMore(){
  if(lastShown >= fullList.length) return;
  state.shown = Math.min(fullList.length, state.shown + PAGE_SIZE);
  const next = fullList.slice(lastShown, state.shown);
  if(!next.length) return;
  $('#grid').insertAdjacentHTML('beforeend', next.map((p,i)=>cardHTML(p, lastShown+i)).join(''));
  lastShown = state.shown;
  updateListUI();
  bindTilts();
  if(!reducedMotion){
    setTimeout(()=>{
      const cards = document.querySelectorAll('#grid .card3d');
      const firstNew = cards[cards.length - next.length];
      if(firstNew) firstNew.scrollIntoView({behavior:'smooth', block:'start'});
    }, 80);
  }
}

/* ---------- کپی و اشتراک‌گذاری ---------- */
async function doCopy(text){
  try{ await navigator.clipboard.writeText(text); return; }catch(e){}
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;top:0';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); }catch(e){}
  ta.remove();
}

async function sharePrompt(p){
  const text = `${p.title}\n\n${plainText(p.text)}\n\n— از پرامپت یار`;
  if(navigator.share){
    try{
      await navigator.share({ title:'پرامپت یار — '+p.title, text, url: location.origin + location.pathname });
      return;
    }catch(e){ if(e && e.name==='AbortError') return; }
  }
  await doCopy(text);
  showToast('📋 متن پرامپت کپی شد');
}

$('#grid').addEventListener('click', async e=>{
  const copyBtn = e.target.closest('.copy-btn');
  if(copyBtn){
    const p = PROMPTS.find(x=>x.id==copyBtn.dataset.copy); if(!p) return;
    await doCopy(plainText(p.text));
    copyBtn.classList.add('copied');
    copyBtn.innerHTML = CHECK_IC + '<span>کپی شد!</span>';
    $('#live').textContent = 'متن پرامپت کپی شد';
    clearTimeout(copyBtn._t);
    copyBtn._t = setTimeout(()=>{
      copyBtn.classList.remove('copied');
      copyBtn.innerHTML = COPY_IC + '<span>کپی پرامپت</span>';
    },1900);
    return;
  }
  const starBtn = e.target.closest('.star-btn');
  if(starBtn){ toggleFav(Number(starBtn.dataset.fav)); return; }
  const shareBtn = e.target.closest('.share-btn');
  if(shareBtn){
    const p = PROMPTS.find(x=>x.id==shareBtn.dataset.share);
    if(p) sharePrompt(p);
  }
});

/* ---------- علاقه‌مندی‌ها و خروجی JSON ---------- */
function toggleFav(id){
  favs = favs.includes(id) ? favs.filter(x=>x!==id) : [...favs, id];
  saveFavs();
  updateFavUI(id);
  if(state.cat==='favs') applyFilter();
}
function updateFavUI(id){
  buildChips();
  const btn = document.querySelector(`[data-fav="${id}"]`);
  if(btn){
    const isFav = favs.includes(id);
    btn.classList.toggle('faved', isFav);
    btn.setAttribute('aria-pressed', isFav);
    btn.textContent = isFav ? '★' : '☆';
  }
  const exp = $('#exportFavs');
  exp.disabled = !favs.length;
  $('#favExportCount').textContent = favs.length ? `(${toFa(favs.length)})` : '';
}
function downloadJSON(data, filename){
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 500);
}
function exportJSON(onlyFavs){
  const items = (onlyFavs ? PROMPTS.filter(p=>favs.includes(p.id)) : PROMPTS).map(p=>({
    id:p.id, category:p.cat, categoryLabel:CATS[p.cat].label,
    subject:p.subject?SUBJECTS[p.subject].label:null,
    grade:p.grade?GRADES[p.grade].label:null,
    major:p.major?MAJORS[p.major].label:null,
    title:p.title, prompt:plainText(p.text), tags:p.tags,
    favorite:favs.includes(p.id),
  }));
  downloadJSON({app:'پرامپت یار', exportedAt:new Date().toISOString(), total:items.length, prompts:items},
    onlyFavs ? 'promptyar-favorites.json' : 'promptyar-prompts.json');
  showToast(onlyFavs ? '⭐ علاقه‌مندی‌ها دانلود شد' : '⬇ فایل JSON دانلود شد');
}
$('#exportAll').addEventListener('click', ()=>exportJSON(false));
$('#exportFavs').addEventListener('click', ()=>exportJSON(true));

/* ---------- جستجو (با debounce)، ریست، بارگذاری بیشتر ---------- */
const searchInput = $('#searchInput');
let searchTimer;
searchInput.addEventListener('input', ()=>{
  clearTimeout(searchTimer);
  searchTimer = setTimeout(()=>{
    state.q = norm(searchInput.value.trim());
    state.shown = PAGE_SIZE;
    updateURL();
    applyFilter();
  }, 140);
});
searchInput.addEventListener('keydown', e=>{
  if(e.key==='Escape'){ searchInput.value=''; state.q=''; state.shown = PAGE_SIZE; updateURL(); applyFilter(); searchInput.blur(); }
});
document.addEventListener('keydown', e=>{
  if(e.key==='/' && document.activeElement!==searchInput){ e.preventDefault(); searchInput.focus(); }
  if(e.key==='Escape' && filtersOpen){
    filtersOpen = false;
    filterPanel.classList.remove('open');
    updateFilterToggle();
  }
});
$('#resetBtn').addEventListener('click', ()=>{
  searchInput.value=''; state.q=''; state.cat='all';
  state.subj='all'; state.grade='all'; state.major='all';
  state.shown = PAGE_SIZE;
  buildChips(); buildSelects(); updateURL(); applyFilter();
});

/* بارگذاری بیشتر: دکمهٔ دستی + اسکرول بی‌نهایت (ناظر روی خود دکمه) */
$('#loadMore').addEventListener('click', loadMore);

/* ---------- اسکرول سریع دوفازی ----------
   ۱) پرش فوری به نزدیکی هدف (بدون اسکرول نرم طولانی که صفحه را به‌هم می‌ریزد)
   ۲) اسکرول نرم فقط برای آخرین فاصلهٔ کوتاه
   در طول حرکت، تیلت کارت‌ها قفل می‌شود. */
let tiltLock = false;
function fastScrollTo(target, opts = {}){
  if(!target) return;
  tiltLock = true;
  const root = document.documentElement;
  const prev = root.style.scrollBehavior;
  /* پرش فوری و دقیق به هدف؛ بدون اسکرول نرم بلند که صفحه را به‌هم می‌ریزد */
  root.style.scrollBehavior = 'auto';
  const absTop = target.getBoundingClientRect().top + window.scrollY;
  const offset = (opts.block === 'center')
    ? Math.max(0, (window.innerHeight - target.offsetHeight)/2)  /* وسط صفحه */
    : 60;                                                        /* کمی پایین‌تر از نوار بالا */
  window.scrollTo({top: Math.max(0, absTop - offset), behavior:'instant'});
  root.style.scrollBehavior = prev;
  /* پاک‌کردن تیلت‌های نیمه‌کاره و بازکردن قفل */
  document.querySelectorAll('#grid .card3d.tilting').forEach(c=>{ c.classList.remove('tilting'); c.style.transform=''; });
  setTimeout(()=>{ tiltLock = false; }, 600);
}
function fastScrollToTop(){
  const root = document.documentElement;
  const prev = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  window.scrollTo({top: 0, behavior:'instant'});
  root.style.scrollBehavior = prev;
}


/* ---------- کپی نمونهٔ طلایی ---------- */
const GOLDEN_TEXT = 'تو یک معلم ریاضی باتجربهٔ پایهٔ هشتم هستی که در مدارس دولتی تدریس می‌کنی. من ۲۵ دانش‌آموز پسر کم‌انگیزه دارم که در حل معادلات درجه یک مشکل دارند و معمولاً در کلاس بی‌حوصله هستند. لطفاً ۵ فعالیت گروهی ۱۰ دقیقه‌ای طراحی کن که هر کدام یک روش متفاوت برای آموزش معادلات درجه یک باشد و همهٔ دانش‌آموزان را درگیر کند. پاسخ را در یک جدول با ستون‌های «نام فعالیت»، «هدف آموزشی»، «وسایل مورد نیاز» و «زمان» ارائه بده.';
const goldenBtn = $('#copyGolden');
if(goldenBtn){
  goldenBtn.addEventListener('click', async ()=>{
    await doCopy(GOLDEN_TEXT);
    goldenBtn.classList.add('copied');
    goldenBtn.innerHTML = CHECK_IC + '<span>کپی شد!</span>';
    $('#live').textContent = 'نمونهٔ پرامپت کپی شد';
    setTimeout(()=>{ goldenBtn.classList.remove('copied'); goldenBtn.innerHTML = COPY_IC + '<span>کپی نمونه</span>'; },1900);
  });
}

/* ---------- توست ---------- */
let toastTimer;
function showToast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 2300);
}

/* ---------- منوی ناوبری (اسکرول سریع دوفازی) ---------- */
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    const target = link.dataset.target;
    if (target === 'favs') {
      setCat('favs');
      fastScrollTo($('#shelf'));
    } else if (target === 'shelf') {
      setCat('all');
      fastScrollTo($('#shelf'));
    } else if (target === 'hero') {
      fastScrollToTop();
    } else {
      fastScrollTo(document.getElementById(target));
    }
  });
});

/* ---------- به‌روزرسانی کلاس active منو هنگام اسکرول ---------- */
const sections = document.querySelectorAll('section[id], .hero, .shelf, #tutorial');
const navLinks = document.querySelectorAll('.nav-link');

function updateActiveNav() {
  const scrollY = window.scrollY;
  let currentSection = '';
  
  sections.forEach(section => {
    const sectionHeight = section.offsetHeight;
    const sectionTop = section.offsetTop - 150;
    const sectionId = section.getAttribute('id') || (section.classList.contains('hero') ? 'hero' : '');
    
    if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
      currentSection = sectionId;
    }
  });
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.dataset.target === currentSection) {
      link.classList.add('active');
    }
  });
}

window.addEventListener('scroll', updateActiveNav);

/* لینک‌های لنگر (مثل «مشاهدهٔ پرامپت‌ها ↓» و لوگو) هم سریع اسکرول می‌شوند */
document.querySelectorAll('a[href^="#"]:not(.nav-link)').forEach(a=>{
  a.addEventListener('click', e=>{
    const hash = a.getAttribute('href');
    if(hash === '#' || !hash){ e.preventDefault(); fastScrollToTop(); return; }
    const el = document.querySelector(hash);
    if(el){ e.preventDefault(); fastScrollTo(el); }
  });
});

/* ---------- پارالاکس تخته ---------- */
const scene = $('#heroScene'), board = $('#board3d');
if(finePointer && !reducedMotion && scene && board){
  let tx=0, ty=0, cx=0, cy=0, raf=null;
  scene.addEventListener('pointermove', e=>{
    const r = scene.getBoundingClientRect();
    tx = ((e.clientX-r.left)/r.width - .5) * 2;
    ty = ((e.clientY-r.top)/r.height - .5) * 2;
    if(!raf) raf = requestAnimationFrame(tick);
  });
  scene.addEventListener('pointerleave', ()=>{ tx=0; ty=0; if(!raf) raf=requestAnimationFrame(tick); });
  function tick(){
    cx += (tx-cx)*.08; cy += (ty-cy)*.08;
    board.style.transform = `rotateX(${4 - cy*2.5}deg) rotateY(${cx*4}deg)`;
    scene.style.setProperty('--par-x', (cx*16)+'px');
    scene.style.setProperty('--par-y', (cy*10)+'px');
    if(Math.abs(tx-cx)>.001 || Math.abs(ty-cy)>.001){ raf = requestAnimationFrame(tick); }
    else { raf = null; }
  }
}

/* ---------- تیلت کارت‌ها ---------- */
function bindTilts(){
  if(!finePointer || reducedMotion) return;
  document.querySelectorAll('#grid .card3d').forEach(card=>{
    if(card._tiltBound) return;
    card._tiltBound = true;
    card.addEventListener('pointermove', e=>{
      if(tiltLock) return;
      const r = card.getBoundingClientRect();
      const px = Math.min(1, Math.max(0, (e.clientX-r.left)/r.width));
      const py = Math.min(1, Math.max(0, (e.clientY-r.top)/r.height));
      card.classList.add('tilting');
      card.style.transform = `rotateX(${(0.5-py)*9}deg) rotateY(${(px-0.5)*10}deg) translateY(-4px)`;
      card.style.setProperty('--gx', (px*100)+'%');
      card.style.setProperty('--gy', (py*100)+'%');
    });
    card.addEventListener('pointerleave', ()=>{
      card.classList.remove('tilting');
      card.style.transform = '';
    });
  });
}

/* ---------- جزئیات زنده ---------- */
try{
  $('#chalkDate').textContent = 'امروز: ' +
    new Intl.DateTimeFormat('fa-IR', {dateStyle:'full'}).format(new Date());
}catch(e){}

/* شمارنده‌ها: هدف‌ها را از دادهٔ واقعی می‌گیریم تا هیچ‌وقت غلط نشود */
const countTotal = $('#countTotal'), countCats = $('#countCats');
if(countTotal) countTotal.dataset.target = PROMPTS.length;
if(countCats) countCats.dataset.target = Object.keys(CATS).length;
const ledeCount = $('#ledeCount');
if(ledeCount) ledeCount.textContent = toFa(PROMPTS.length);
const footCount = $('#footCount');
if(footCount) footCount.textContent = toFa(PROMPTS.length);

document.querySelectorAll('.counter').forEach(el=>{
  const target = +el.dataset.target, dur = 900, t0 = performance.now();
  (function step(t){
    const k = Math.min((t-t0)/dur, 1), eased = 1-Math.pow(1-k,3);
    el.textContent = toFa(Math.round(target*eased));
    if(k<1) requestAnimationFrame(step);
  })(t0);
});

/* ---------- پنل کشویی فیلترها (نوار همیشه یک‌ردیفه و باثبات، بدون جمع‌شدن خودکار) ---------- */
const toolbar = $('#toolbar');
const filterToggle = $('#filterToggle'), filterToggleLabel = $('#filterToggleLabel'), filterCountEl = $('#filterCount');
const filterPanel = $('#toolbarFilters');
let filtersOpen = false;
function activeFilterCount(){
  let n = 0;
  if(state.subj !== 'all') n++;
  if(state.grade !== 'all') n++;
  if(state.major !== 'all') n++;
  return n;
}
function updateFilterToggle(){
  const n = activeFilterCount();
  if(filterCountEl){
    filterCountEl.textContent = n ? toFa(n) : '';
    filterCountEl.classList.toggle('show', !!n);
  }
  if(filterToggle){
    filterToggle.setAttribute('aria-expanded', String(filtersOpen));
    if(filterToggleLabel) filterToggleLabel.textContent = filtersOpen ? 'بستن فیلترها' : 'درس / پایه / رشته';
  }
}
if(filterToggle && filterPanel){
  filterToggle.addEventListener('click', (e)=>{
    e.stopPropagation();
    filtersOpen = !filtersOpen;
    filterPanel.classList.toggle('open', filtersOpen);
    updateFilterToggle();
  });
  document.addEventListener('click', (e)=>{
    if(filtersOpen && !toolbar.contains(e.target)){
      filtersOpen = false;
      filterPanel.classList.remove('open');
      updateFilterToggle();
    }
  });
}

/* ---------- دکمهٔ بازگشت به بالا ---------- */
const toTop = $('#toTop');
if(toTop){
  const onScroll = ()=> toTop.classList.toggle('show', window.scrollY > 700);
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
  toTop.addEventListener('click', fastScrollToTop);
}

/* ---------- سرویس‌ورکر (فقط روی https) ---------- */
if('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}

/* ---------- شروع ---------- */
buildChips();
buildSelects();
updateFavUI(-1);
applyFilter();
