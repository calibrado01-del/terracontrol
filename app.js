// ============================================================
// TERRACONTROL — app.js
// Terra Forte Construtora
// ============================================================

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const CAT_COR = { 'Materiais':'#8B4513','Mão de obra':'#2D6A2D','Equipamento':'#1a6ea0','Transporte':'#b07d00','Serviços':'#7b3fa0' };
const CAT_IC  = { 'Materiais':'ti-package','Mão de obra':'ti-users','Equipamento':'ti-crane','Transporte':'ti-truck','Serviços':'ti-tool' };
const ST_B    = { 'Em andamento':'b-blue','Planejamento':'b-amber','Concluída':'b-green','Pausada':'b-gray' };
const MESES   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const PAL     = ['#8B4513','#2D6A2D','#1a6ea0','#b07d00','#7b3fa0','#c0392b'];

let obras=[], gastos=[], forns=[], editObraId=null, editFornId=null, charts={}, mFiltros={obra:''};
let userId = null;

// ── AUTH ──────────────────────────────────────────────────
async function fazerLogin() {
  const email = document.getElementById('l-email').value.trim();
  const senha = document.getElementById('l-senha').value;
  const errEl = document.getElementById('login-error');
  errEl.textContent = '';
  if (!email || !senha) { errEl.textContent = 'Preencha e-mail e senha.'; return; }
  const { data, error } = await db.auth.signInWithPassword({ email, password: senha });
  if (error) { errEl.textContent = 'E-mail ou senha incorretos.'; return; }
  userId = data.user.id;
  iniciarApp();
}

async function fazerLogout() {
  await db.auth.signOut();
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  obras=[]; gastos=[]; forns=[];
}

async function iniciarApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  setLoading(true);
  await Promise.all([carregarObras(), carregarForns(), carregarGastos()]);
  setLoading(false);
  popSelects(); popMeses();
  if (isMobile()) renderMDash(); else renderDDash();
  document.getElementById('g-data').value = hoje();
}

// Esconde loading e mostra login se não houver sessão em 3 segundos
setTimeout(() => {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
}, 3000);

db.auth.onAuthStateChange((event, session) => {
  if (session) {
    userId = session.user.id;
    iniciarApp();
  } else {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
  }
});

// ── SUPABASE CRUD ─────────────────────────────────────────
async function carregarObras()  { const {data}=await db.from('obras').select('*').order('created_at'); obras=data||[]; }
async function carregarForns()  { const {data}=await db.from('fornecedores').select('*').order('nome'); forns=data||[]; }
async function carregarGastos() { const {data}=await db.from('gastos').select('*').order('data',{ascending:false}); gastos=data||[]; }

async function inserirObra(obj)   { const {data}=await db.from('obras').insert([obj]).select(); return data?.[0]; }
async function atualizarObra(id,obj) { await db.from('obras').update(obj).eq('id',id); }
async function deletarObra(id)    { await db.from('obras').delete().eq('id',id); }

async function inserirForn(obj)   { const {data}=await db.from('fornecedores').insert([obj]).select(); return data?.[0]; }
async function atualizarForn(id,obj) { await db.from('fornecedores').update(obj).eq('id',id); }
async function deletarForn(id)    { await db.from('fornecedores').delete().eq('id',id); }

async function inserirGasto(obj)  { const {data}=await db.from('gastos').insert([obj]).select(); return data?.[0]; }
async function deletarGasto(id)   { await db.from('gastos').delete().eq('id',id); }

// ── HELPERS ───────────────────────────────────────────────
function brl(v)    { return 'R$ '+Number(v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function dtBR(d)   { if(!d)return''; const p=d.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }
function mesNome(ym) { const[y,m]=ym.split('-'); return MESES[parseInt(m)-1]+'/'+y; }
function tot(list) { return list.reduce((a,g)=>a+(parseFloat(g.valor)||0),0); }
function initials(n) { return n.split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase(); }
function oMap()    { const m={}; obras.forEach(o=>m[o.id]=o.nome); return m; }
function isMobile(){ return window.innerWidth<=640; }
function hoje()    { return new Date().toISOString().split('T')[0]; }
function setLoading(v){ const el=document.getElementById('loading'); if(el)el.style.display=v?'flex':'none'; }

function dChart(id,type,data,opts) {
  if(charts[id]){charts[id].destroy();delete charts[id]}
  const ctx=document.getElementById(id); if(!ctx)return;
  charts[id]=new Chart(ctx,{type,data,options:{responsive:true,maintainAspectRatio:false,...opts}});
}

// ── NAVIGATION ────────────────────────────────────────────
function dShowSec(id) {
  document.querySelectorAll('.desk-shell .sec').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.desk-nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const idx=['d-dashboard','d-obras','d-gastos','d-forns','d-rel'].indexOf(id);
  document.querySelectorAll('.desk-nav-btn')[idx].classList.add('active');
  popSelects(); popMeses();
  if(id==='d-dashboard') renderDDash();
  if(id==='d-obras')     renderDObras();
  if(id==='d-gastos')    renderDGastos();
  if(id==='d-forns')     renderDForns();
  if(id==='d-rel')       { document.querySelectorAll('.stab')[0].click(); }
}
function dShowStab(id) {
  document.querySelectorAll('#d-rel .ssec').forEach(s=>s.style.display='none');
  document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active'));
  document.getElementById(id).style.display='block';
  const idx=['dr-obra','dr-forn','dr-per','dr-mo'].indexOf(id);
  document.querySelectorAll('.stab')[idx].classList.add('active');
  if(id==='dr-obra') renderRelObra();
  if(id==='dr-forn') renderRelForn();
  if(id==='dr-per')  renderRelPer();
  if(id==='dr-mo')   renderRelMO();
}
function mShowSec(id,btn) {
  document.querySelectorAll('.mob-sec').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.mob-nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
  popSelects(); popMeses();
  if(id==='m-dashboard') renderMDash();
  if(id==='m-obras')     renderMObras();
  if(id==='m-gastos')    renderMGastos();
  if(id==='m-forns')     renderMForns();
  if(id==='m-rel')       renderMRelObra();
}
function mShowRel(id,el) {
  ['mr-obra','mr-forn','mr-per','mr-mo'].forEach(x=>{const e=document.getElementById(x);if(e)e.style.display='none'});
  document.querySelectorAll('#m-rel .mob-filter-row .mob-chip').forEach(c=>c.classList.remove('active'));
  const t=document.getElementById(id); if(t)t.style.display='block';
  el.classList.add('active');
  if(id==='mr-obra') renderMRelObra();
  if(id==='mr-forn') renderMRelForn();
  if(id==='mr-per')  renderMRelPer();
  if(id==='mr-mo')   renderMRelMO();
}
function mSetFiltro(key,val) {
  mFiltros[key]=val;
  document.querySelectorAll(`#m-filter-row [data-key="${key}"]`).forEach(c=>c.classList.remove('active'));
  const t=document.querySelector(`#m-filter-row [data-key="${key}"][data-val="${val}"]`);
  if(t)t.classList.add('active');
  renderMGastos();
}

// ── MODALS ────────────────────────────────────────────────
function openModal(id) {
  if(id==='m-gasto'){ popSelects(); document.getElementById('g-data').value=hoje(); }
  document.getElementById(id).classList.add('open');
  document.body.style.overflow='hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow='';
  if(id==='m-obra'){ clearOF(); editObraId=null; }
  if(id==='m-forn'){ clearFF(); editFornId=null; }
  if(id==='m-gasto') clearGF();
}
function clearOF(){ ['o-nome','o-prop','o-local','o-obs','o-ini','o-fim'].forEach(i=>{const e=document.getElementById(i);if(e)e.value=''}); const eo=document.getElementById('o-orc');if(eo)eo.value=''; const es=document.getElementById('o-status');if(es)es.value='Em andamento'; const et=document.getElementById('m-obra-title');if(et)et.textContent='Cadastrar obra'; }
function clearFF(){ ['f-nome','f-tel','f-obs'].forEach(i=>{const e=document.getElementById(i);if(e)e.value=''}); const et=document.getElementById('m-forn-title');if(et)et.textContent='Cadastrar fornecedor'; }
function clearGF(){ ['g-forn','g-desc','g-nf'].forEach(i=>{const e=document.getElementById(i);if(e)e.value=''}); ['g-valor','g-obra','g-cat'].forEach(i=>{const e=document.getElementById(i);if(e)e.value=''}); }

// ── SELECTS / MESES ───────────────────────────────────────
function popSelects() {
  ['g-obra','d-f-obra','d-rel-obra','d-rel-mo-obra','d-rel-per-obra','d-rel-forn-obra','m-rel-obra','m-rel-mo-obra'].forEach(sid=>{
    const el=document.getElementById(sid); if(!el)return;
    const all=sid!=='g-obra'; const cur=el.value;
    el.innerHTML=all?'<option value="">Todas as obras</option>':'<option value="">Selecione</option>';
    obras.forEach(o=>{const op=document.createElement('option');op.value=o.id;op.textContent=o.nome;el.appendChild(op)});
    if(cur)el.value=cur;
  });
  ['d-rel-forn','m-rel-forn'].forEach(sid=>{
    const el=document.getElementById(sid); if(!el)return;
    const cur=el.value; el.innerHTML='<option value="">Todos</option>';
    forns.forEach(f=>{const op=document.createElement('option');op.value=f.id;op.textContent=f.nome;el.appendChild(op)});
    if(cur)el.value=cur;
  });
  const fr=document.getElementById('m-filter-row');
  if(fr){
    const cur=mFiltros.obra;
    fr.innerHTML=`<span class="mob-chip${cur===''?' active':''}" onclick="mSetFiltro('obra','')" data-key="obra" data-val="">Todas</span>`;
    obras.forEach(o=>{const s=document.createElement('span');s.className='mob-chip'+(cur===o.id?' active':'');s.textContent=o.nome;s.onclick=()=>mSetFiltro('obra',o.id);s.dataset.key='obra';s.dataset.val=o.id;fr.appendChild(s)});
  }
}
function popMeses() {
  const ms=[...new Set(gastos.map(g=>g.data.slice(0,7)))].sort().reverse();
  ['d-f-mes','d-rel-mes','m-rel-mes'].forEach(sid=>{
    const el=document.getElementById(sid); if(!el)return;
    const cur=el.value; el.innerHTML='<option value="">Todos</option>';
    ms.forEach(m=>{const op=document.createElement('option');op.value=m;op.textContent=mesNome(m);el.appendChild(op)});
    if(cur)el.value=cur;
  });
}

// ── AUTOCOMPLETE ──────────────────────────────────────────
function acInput(inp) {
  const q=inp.value.trim().toLowerCase();
  const list=document.getElementById('ac-list');
  const matches=forns.filter(f=>!q||f.nome.toLowerCase().includes(q));
  list.innerHTML='';
  matches.slice(0,8).forEach(f=>{
    const d=document.createElement('div'); d.className='ac-item';
    d.innerHTML=`<i class="ti ti-user" style="font-size:14px;color:#888"></i>${f.nome}<span class="ac-cat">${f.tipo||''}</span>`;
    d.onmousedown=d.ontouchstart=()=>{inp.value=f.nome;list.style.display='none'};
    list.appendChild(d);
  });
  if(q&&!forns.find(f=>f.nome.toLowerCase()===q)){
    const d=document.createElement('div'); d.className='ac-new';
    d.innerHTML=`<i class="ti ti-plus" style="font-size:14px"></i>Adicionar "${inp.value}"`;
    d.onmousedown=d.ontouchstart=async()=>{
      const nf={nome:inp.value.trim(),tipo:'Materiais',telefone:'',obs:''};
      const novo=await inserirForn(nf);
      if(novo)forns.push(novo);
      list.style.display='none';
    };
    list.appendChild(d);
  }
  list.style.display=list.children.length?'block':'none';
}
function acBlur(){ setTimeout(()=>{const l=document.getElementById('ac-list');if(l)l.style.display='none'},250); }

// ── OBRAS ─────────────────────────────────────────────────
async function salvarObra() {
  const nome=document.getElementById('o-nome').value.trim();
  const prop=document.getElementById('o-prop').value.trim();
  if(!nome||!prop){alert('Preencha nome e proprietário.');return}
  setLoading(true);
  const obj={nome,proprietario:prop,local:document.getElementById('o-local').value.trim(),orcamento:parseFloat(document.getElementById('o-orc').value)||0,status:document.getElementById('o-status').value,inicio:document.getElementById('o-ini').value||null,fim:document.getElementById('o-fim').value||null,obs:document.getElementById('o-obs').value.trim()};
  if(editObraId){
    await atualizarObra(editObraId,obj);
    const i=obras.findIndex(o=>o.id===editObraId); if(i>-1)obras[i]={...obras[i],...obj};
  } else {
    const nova=await inserirObra(obj); if(nova)obras.push(nova);
  }
  setLoading(false); closeModal('m-obra'); popSelects();
  if(isMobile())renderMObras(); else renderDObras();
}
function editObra(id) {
  const o=obras.find(x=>x.id===id); if(!o)return; editObraId=id;
  document.getElementById('o-nome').value=o.nome;
  document.getElementById('o-prop').value=o.proprietario||'';
  document.getElementById('o-local').value=o.local||'';
  document.getElementById('o-orc').value=o.orcamento||'';
  document.getElementById('o-status').value=o.status;
  document.getElementById('o-ini').value=o.inicio||'';
  document.getElementById('o-fim').value=o.fim||'';
  document.getElementById('o-obs').value=o.obs||'';
  document.getElementById('m-obra-title').textContent='Editar obra';
  openModal('m-obra');
}
async function delObra(id) {
  if(!confirm('Excluir esta obra?'))return;
  setLoading(true); await deletarObra(id); obras=obras.filter(o=>o.id!==id);
  setLoading(false); popSelects();
  if(isMobile())renderMObras(); else renderDObras();
}

// ── FORNECEDORES ──────────────────────────────────────────
async function salvarForn() {
  const nome=document.getElementById('f-nome').value.trim();
  if(!nome){alert('Informe o nome.');return}
  setLoading(true);
  const obj={nome,tipo:document.getElementById('f-tipo-c').value,telefone:document.getElementById('f-tel').value.trim(),obs:document.getElementById('f-obs').value.trim()};
  if(editFornId){
    await atualizarForn(editFornId,obj);
    const i=forns.findIndex(f=>f.id===editFornId); if(i>-1)forns[i]={...forns[i],...obj};
  } else {
    const novo=await inserirForn(obj); if(novo)forns.push(novo);
  }
  setLoading(false); closeModal('m-forn');
  if(isMobile())renderMForns(); else renderDForns();
}
function editForn(id) {
  const f=forns.find(x=>x.id===id); if(!f)return; editFornId=id;
  document.getElementById('f-nome').value=f.nome;
  document.getElementById('f-tipo-c').value=f.tipo||'Materiais';
  document.getElementById('f-tel').value=f.telefone||'';
  document.getElementById('f-obs').value=f.obs||'';
  document.getElementById('m-forn-title').textContent='Editar fornecedor';
  openModal('m-forn');
}
async function delForn(id) {
  if(!confirm('Excluir fornecedor?'))return;
  setLoading(true); await deletarForn(id); forns=forns.filter(f=>f.id!==id);
  setLoading(false);
  if(isMobile())renderMForns(); else renderDForns();
}

// ── GASTOS ────────────────────────────────────────────────
async function salvarGasto() {
  const obra_id=document.getElementById('g-obra').value;
  const categoria=document.getElementById('g-cat').value;
  const valor=parseFloat(document.getElementById('g-valor').value);
  const data=document.getElementById('g-data').value;
  if(!obra_id||!categoria||!valor||!data){alert('Preencha obra, categoria, valor e data.');return}
  const fn=document.getElementById('g-forn').value.trim();
  if(fn&&!forns.find(f=>f.nome.toLowerCase()===fn.toLowerCase())){
    const nf=await inserirForn({nome:fn,tipo:categoria,telefone:'',obs:''}); if(nf)forns.push(nf);
  }
  setLoading(true);
  const obj={obra_id,categoria,fornecedor:fn,valor,data,forma_pagamento:document.getElementById('g-pag').value,descricao:document.getElementById('g-desc').value.trim(),nf:document.getElementById('g-nf').value.trim()};
  const novo=await inserirGasto(obj); if(novo)gastos.unshift(novo);
  setLoading(false); closeModal('m-gasto'); popMeses();
  if(isMobile())renderMGastos(); else renderDGastos();
}
async function delGasto(id) {
  if(!confirm('Excluir lançamento?'))return;
  setLoading(true); await deletarGasto(id); gastos=gastos.filter(g=>g.id!==id);
  setLoading(false);
  if(isMobile())renderMGastos(); else renderDGastos();
}

// ── RENDER HELPERS ────────────────────────────────────────
function giHTML(g,om) {
  const cor=CAT_COR[g.categoria]||'#888', ic=CAT_IC[g.categoria]||'ti-tag', on=om?om[g.obra_id]||'':'';
  const nfb=g.nf?`<span class="nf-badge"><i class="ti ti-file-text"></i>${g.nf}</span>`:'';
  return`<div class="gi"><div class="gi-left"><div class="gi-icon" style="background:${cor}18"><i class="ti ${ic}" style="color:${cor};font-size:16px"></i></div><div><div class="gi-title">${g.categoria}${nfb}</div><div class="gi-meta">${g.fornecedor?g.fornecedor+' · ':''}${on}${g.forma_pagamento?' · '+g.forma_pagamento:''}</div>${g.descricao?`<div class="gi-meta">${g.descricao}</div>`:''}</div></div><div><div class="gi-val">${brl(g.valor)}</div><div class="gi-date">${dtBR(g.data)}</div><div style="text-align:right;margin-top:4px"><button class="btn-del" onclick="delGasto('${g.id}')"><i class="ti ti-trash" style="font-size:14px"></i></button></div></div></div>`;
}
function mGiHTML(g,om) {
  const cor=CAT_COR[g.categoria]||'#888', ic=CAT_IC[g.categoria]||'ti-tag', on=om?om[g.obra_id]||'':'';
  return`<div class="mob-gi"><div class="mob-gi-top"><div class="mob-gi-cat"><div class="mob-gi-icon" style="background:${cor}18"><i class="ti ${ic}" style="color:${cor};font-size:15px"></i></div><span class="mob-gi-title">${g.categoria}</span></div><div style="display:flex;align-items:center;gap:8px"><div class="mob-gi-val">${brl(g.valor)}</div><button class="btn-del" onclick="delGasto('${g.id}')"><i class="ti ti-trash" style="font-size:14px"></i></button></div></div><div class="mob-gi-meta">${g.fornecedor?g.fornecedor+' · ':''}${on} · ${dtBR(g.data)}</div></div>`;
}
function relMetrics(t,tmo,tmat,extra='') { return`<div class="metrics" style="margin-bottom:1rem"><div class="metric"><div class="metric-label">Total gasto</div><div class="metric-value mv-brown">${brl(t)}</div></div><div class="metric"><div class="metric-label">Mão de obra</div><div class="metric-value mv-green">${brl(tmo)}</div></div><div class="metric"><div class="metric-label">Materiais</div><div class="metric-value">${brl(tmat)}</div></div>${extra}</div>`; }
function relBarras(catT,t) { return Object.entries(catT).sort((a,b)=>b[1]-a[1]).map(([cat,val])=>{const pct=t>0?Math.round(val/t*100):0;return`<div class="prog-bar"><div class="pb-label"><span style="font-weight:500">${cat}</span><span style="color:#888">${brl(val)} · ${pct}%</span></div><div class="pb-bg"><div class="pb-fill" style="width:${pct}%;background:${CAT_COR[cat]||'#888'}"></div></div></div>`}).join(''); }

// ── DESKTOP RENDERS ───────────────────────────────────────
function renderDDash() {
  const t=tot(gastos),tmo=tot(gastos.filter(g=>g.categoria==='Mão de obra')),tmat=tot(gastos.filter(g=>g.categoria==='Materiais')),na=obras.filter(o=>o.status==='Em andamento').length;
  document.getElementById('d-dash-metrics').innerHTML=`<div class="metric"><div class="metric-label">Total gasto</div><div class="metric-value mv-brown">${brl(t)}</div></div><div class="metric"><div class="metric-label">Mão de obra</div><div class="metric-value mv-green">${brl(tmo)}</div></div><div class="metric"><div class="metric-label">Materiais</div><div class="metric-value">${brl(tmat)}</div></div><div class="metric"><div class="metric-label">Obras ativas</div><div class="metric-value">${na}</div></div>`;
  const catT={};gastos.forEach(g=>{catT[g.categoria]=(catT[g.categoria]||0)+(parseFloat(g.valor)||0)});const cats=Object.keys(catT);
  if(cats.length)dChart('d-chartCat','bar',{labels:cats,datasets:[{label:'R$',data:cats.map(c=>catT[c]),backgroundColor:cats.map(c=>CAT_COR[c]||'#888'),borderRadius:6,borderSkipped:false}]},{plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>'R$'+(v/1000).toFixed(0)+'k',font:{size:11}},grid:{color:'rgba(0,0,0,.05)'}},x:{grid:{display:false}}}});
  else document.getElementById('d-chartCat').parentElement.innerHTML='<div class="empty"><i class="ti ti-chart-bar-off"></i>Sem dados ainda.</div>';
  const ot={};gastos.forEach(g=>{ot[g.obra_id]=(ot[g.obra_id]||0)+(parseFloat(g.valor)||0)});const oids=Object.keys(ot),om=oMap();
  if(oids.length)dChart('d-chartObra','doughnut',{labels:oids.map(id=>om[id]||id),datasets:[{data:oids.map(id=>ot[id]),backgroundColor:oids.map((_,i)=>PAL[i%PAL.length]),borderWidth:2}]},{plugins:{legend:{position:'bottom',labels:{font:{size:12},padding:14}}}});
  else document.getElementById('d-chartObra').parentElement.innerHTML='<div class="empty"><i class="ti ti-chart-pie-off"></i>Sem obras com gastos.</div>';
  const rec=gastos.slice(0,5),om2=oMap();
  document.getElementById('d-recentes').innerHTML=rec.length?rec.map(g=>giHTML(g,om2)).join(''):'<div class="empty"><i class="ti ti-receipt-off"></i>Nenhum lançamento ainda.</div>';
}
function renderDObras() {
  const el=document.getElementById('d-obras-list');
  if(!obras.length){el.innerHTML='<div class="empty"><i class="ti ti-building-off"></i>Nenhuma obra cadastrada.</div>';return}
  el.innerHTML=obras.map(o=>{
    const go=gastos.filter(g=>g.obra_id===o.id),gt=tot(go),perc=o.orcamento>0?Math.min(100,Math.round(gt/o.orcamento*100)):0;
    return`<div class="card" style="margin-bottom:10px;padding:.875rem 1.25rem"><div class="card-hdr"><div><div style="font-size:15px;font-weight:500">${o.nome}</div><div style="font-size:13px;color:#888;margin-top:2px">${o.proprietario||''}${o.local?' · '+o.local:''}</div></div><div style="display:flex;gap:6px;align-items:center"><span class="badge ${ST_B[o.status]||'b-gray'}">${o.status}</span><button class="btn-ic" onclick="editObra('${o.id}')"><i class="ti ti-pencil"></i></button><button class="btn-ic" onclick="delObra('${o.id}')"><i class="ti ti-trash" style="color:#c0392b"></i></button></div></div><div style="display:flex;gap:20px;font-size:13px;flex-wrap:wrap"><span style="color:#888">Gasto: <strong style="color:#1a1a1a">${brl(gt)}</strong></span>${o.orcamento?`<span style="color:#888">Orç.: <strong>${brl(o.orcamento)}</strong></span><span style="color:#888">${perc}% utilizado</span>`:''}<span style="color:#888">${go.length} lançamentos</span></div>${o.orcamento?`<div class="bar-bg"><div class="bar-fill" style="width:${perc}%;background:${perc>90?'#c0392b':'#8B4513'}"></div></div>`:''}</div>`;
  }).join('');
}
function renderDGastos() {
  const of=document.getElementById('d-f-obra').value,cf=document.getElementById('d-f-cat').value,tf=document.getElementById('d-f-tipo').value,mf=document.getElementById('d-f-mes').value,om=oMap();
  let list=[...gastos];
  if(of)list=list.filter(g=>g.obra_id===of);
  if(cf)list=list.filter(g=>g.categoria===cf);
  if(tf==='mat')list=list.filter(g=>g.categoria!=='Mão de obra');
  if(tf==='mo')list=list.filter(g=>g.categoria==='Mão de obra');
  if(mf)list=list.filter(g=>g.data&&g.data.startsWith(mf));
  const el=document.getElementById('d-gastos-list');
  el.innerHTML=list.length?list.map(g=>giHTML(g,om)).join(''):'<div class="empty"><i class="ti ti-receipt-off"></i>Nenhum lançamento.</div>';
  document.getElementById('d-gastos-total').textContent=list.length?`Total filtrado: ${brl(tot(list))} (${list.length} lançamentos)`:'';
}
function renderDForns() {
  const el=document.getElementById('d-forns-list');
  if(!forns.length){el.innerHTML='<div class="empty"><i class="ti ti-users"></i>Nenhum fornecedor.</div>';return}
  el.innerHTML=forns.map(f=>{const gf=gastos.filter(g=>g.fornecedor&&g.fornecedor.toLowerCase()===f.nome.toLowerCase()),gt=tot(gf);return`<div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:.875rem 1.25rem;margin-bottom:8px"><div style="display:flex;align-items:center;gap:12px"><div style="width:36px;height:36px;border-radius:8px;background:#f5ede6;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:500;color:#8B4513">${initials(f.nome)}</div><div><div style="font-size:14px;font-weight:500">${f.nome}</div><div style="font-size:12px;color:#888;margin-top:2px">${f.tipo||''}${f.telefone?' · '+f.telefone:''}</div></div></div><div style="text-align:right"><div style="font-size:14px;font-weight:500;color:#8B4513">${brl(gt)}</div><div style="font-size:11px;color:#888">${gf.length} compras</div><div style="display:flex;gap:6px;justify-content:flex-end;margin-top:6px"><button class="btn-ic" onclick="editForn('${f.id}')"><i class="ti ti-pencil"></i></button><button class="btn-ic" onclick="delForn('${f.id}')"><i class="ti ti-trash" style="color:#c0392b"></i></button></div></div></div>`}).join('');
}

// ── MOBILE RENDERS ────────────────────────────────────────
function renderMDash() {
  const t=tot(gastos),tmo=tot(gastos.filter(g=>g.categoria==='Mão de obra')),tmat=tot(gastos.filter(g=>g.categoria==='Materiais')),na=obras.filter(o=>o.status==='Em andamento').length;
  document.getElementById('m-dash-metrics').innerHTML=`<div class="mob-metric"><div class="mob-metric-label">Total gasto</div><div class="mob-metric-value mv-brown">${brl(t)}</div></div><div class="mob-metric"><div class="mob-metric-label">Obras ativas</div><div class="mob-metric-value">${na}</div></div><div class="mob-metric"><div class="mob-metric-label">Mão de obra</div><div class="mob-metric-value mv-green">${brl(tmo)}</div></div><div class="mob-metric"><div class="mob-metric-label">Materiais</div><div class="mob-metric-value">${brl(tmat)}</div></div>`;
  const catT={};gastos.forEach(g=>{catT[g.categoria]=(catT[g.categoria]||0)+(parseFloat(g.valor)||0)});const cats=Object.keys(catT);
  if(cats.length)dChart('m-chartCat','bar',{labels:cats,datasets:[{label:'R$',data:cats.map(c=>catT[c]),backgroundColor:cats.map(c=>CAT_COR[c]||'#888'),borderRadius:5,borderSkipped:false}]},{plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>'R$'+(v/1000).toFixed(0)+'k',font:{size:10}},grid:{color:'rgba(0,0,0,.05)'}},x:{ticks:{font:{size:11}},grid:{display:false}}}});
  const ot={};gastos.forEach(g=>{ot[g.obra_id]=(ot[g.obra_id]||0)+(parseFloat(g.valor)||0)});const oids=Object.keys(ot),om=oMap();
  if(oids.length)dChart('m-chartObra','doughnut',{labels:oids.map(id=>om[id]||id),datasets:[{data:oids.map(id=>ot[id]),backgroundColor:oids.map((_,i)=>PAL[i%PAL.length]),borderWidth:2}]},{plugins:{legend:{position:'bottom',labels:{font:{size:11},padding:10,boxWidth:10}}}});
  const rec=gastos.slice(0,5),om2=oMap();
  document.getElementById('m-recentes').innerHTML=rec.length?rec.map(g=>mGiHTML(g,om2)).join(''):'<div class="empty"><i class="ti ti-receipt-off"></i>Nenhum lançamento ainda.</div>';
}
function renderMObras() {
  const el=document.getElementById('m-obras-list');
  if(!obras.length){el.innerHTML=`<div class="empty"><i class="ti ti-building-off"></i>Nenhuma obra.<br><br><button class="mob-btn-p" style="max-width:200px;margin:0 auto" onclick="openModal('m-obra')">+ Nova obra</button></div>`;return}
  el.innerHTML=obras.map(o=>{const go=gastos.filter(g=>g.obra_id===o.id),gt=tot(go),perc=o.orcamento>0?Math.min(100,Math.round(gt/o.orcamento*100)):0;return`<div class="mob-obra-card"><div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:6px"><div><div class="mob-obra-name">${o.nome}</div><div class="mob-obra-sub">${o.proprietario||''}${o.local?' · '+o.local:''}</div></div><div style="display:flex;gap:6px;align-items:center"><span class="badge ${ST_B[o.status]||'b-gray'}">${o.status}</span><button class="btn-del" onclick="editObra('${o.id}')"><i class="ti ti-pencil" style="font-size:16px;color:#888"></i></button></div></div><div style="display:flex;gap:16px;font-size:13px;flex-wrap:wrap;margin-bottom:6px"><span style="color:#888">Gasto: <strong style="color:#1a1a1a">${brl(gt)}</strong></span>${o.orcamento?`<span style="color:#888">${perc}% do orç.</span>`:''}<span style="color:#888">${go.length} lanç.</span></div>${o.orcamento?`<div class="bar-bg"><div class="bar-fill" style="width:${perc}%;background:${perc>90?'#c0392b':'#8B4513'}"></div></div>`:''}</div>`}).join('')+`<div style="margin-top:12px"><button class="mob-btn-p" onclick="openModal('m-obra')"><i class="ti ti-plus"></i> Nova obra</button></div>`;
}
function renderMGastos() {
  const of=mFiltros.obra,om=oMap();
  let list=[...gastos]; if(of)list=list.filter(g=>g.obra_id===of);
  const el=document.getElementById('m-gastos-list');
  el.innerHTML=list.length?list.map(g=>mGiHTML(g,om)).join(''):'<div class="empty"><i class="ti ti-receipt-off"></i>Nenhum lançamento.</div>';
  document.getElementById('m-gastos-total').textContent=list.length?`Total: ${brl(tot(list))} (${list.length} lançamentos)`:'';
}
function renderMForns() {
  const el=document.getElementById('m-forns-list');
  if(!forns.length){el.innerHTML=`<div class="empty"><i class="ti ti-users"></i>Nenhum fornecedor.<br><br><button class="mob-btn-p" style="max-width:220px;margin:0 auto" onclick="openModal('m-forn')">+ Novo fornecedor</button></div>`;return}
  el.innerHTML=forns.map(f=>{const gf=gastos.filter(g=>g.fornecedor&&g.fornecedor.toLowerCase()===f.nome.toLowerCase()),gt=tot(gf);return`<div class="mob-forn-card"><div class="mob-forn-av">${initials(f.nome)}</div><div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:500">${f.nome}</div><div style="font-size:12px;color:#888;margin-top:1px">${f.tipo||''}${f.telefone?' · '+f.telefone:''}</div></div><div style="text-align:right;flex-shrink:0"><div style="font-size:14px;font-weight:500;color:#8B4513">${brl(gt)}</div><div style="font-size:11px;color:#888">${gf.length} compras</div><button class="btn-del" onclick="editForn('${f.id}')" style="margin-top:4px"><i class="ti ti-pencil" style="font-size:14px;color:#888"></i></button></div></div>`}).join('')+`<div style="margin-top:12px"><button class="mob-btn-p" onclick="openModal('m-forn')"><i class="ti ti-plus"></i> Novo fornecedor</button></div>`;
}

// ── RELATÓRIOS ────────────────────────────────────────────
function _relObra(prefix,cid){
  const oid=document.getElementById(prefix+'rel-obra').value,el=document.getElementById(prefix+'rel-obra-c');
  if(!oid){el.innerHTML='<div class="empty"><i class="ti ti-building"></i>Selecione uma obra.</div>';return}
  const obra=obras.find(o=>o.id===oid),go=gastos.filter(g=>g.obra_id===oid),t=tot(go),tmo=tot(go.filter(g=>g.categoria==='Mão de obra')),tmat=tot(go.filter(g=>g.categoria==='Materiais')),saldo=obra.orcamento?obra.orcamento-t:null;
  const catT={};go.forEach(g=>{catT[g.categoria]=(catT[g.categoria]||0)+(parseFloat(g.valor)||0)});const cats=Object.keys(catT);
  const saldoCard=saldo!==null?`<div class="metric"><div class="metric-label">Saldo restante</div><div class="metric-value ${saldo>=0?'mv-green':'mv-red'}">${brl(saldo)}</div></div>`:'';
  el.innerHTML=relMetrics(t,tmo,tmat,saldoCard)+(cats.length?`<div class="card" style="margin-bottom:12px"><div class="card-title">Por categoria</div><div class="chart-wrap" style="height:190px"><canvas id="${cid}"></canvas></div></div>`:'')+'<div class="card">'+relBarras(catT,t)+'</div>'+(obra?`<div style="margin-top:12px;text-align:right"><button class="btn-s" onclick="exportCSV('${oid}')"><i class="ti ti-download" style="font-size:13px;vertical-align:-1px"></i> Exportar CSV</button></div>`:'');
  if(cats.length)setTimeout(()=>dChart(cid,'pie',{labels:cats,datasets:[{data:cats.map(c=>catT[c]),backgroundColor:cats.map(c=>CAT_COR[c]||'#888'),borderWidth:2}]},{plugins:{legend:{position:'right',labels:{font:{size:11},padding:10}}}}),80);
}
function renderRelObra(){_relObra('d-','d-chartRelObra')}
function renderMRelObra(){_relObra('m-','m-chartRelObra')}

function _relForn(prefix,cid){
  const fid=document.getElementById(prefix+'rel-forn').value,el=document.getElementById(prefix+'rel-forn-c');
  let list=gastos;
  if(fid){const f=forns.find(x=>x.id===fid);if(f)list=list.filter(g=>g.fornecedor&&g.fornecedor.toLowerCase()===f.nome.toLowerCase())}
  const t=tot(list),byF={};list.forEach(g=>{const k=g.fornecedor||'(sem fornecedor)';byF[k]=(byF[k]||0)+(parseFloat(g.valor)||0)});
  const fkeys=Object.keys(byF).sort((a,b)=>byF[b]-byF[a]);
  el.innerHTML=`<div class="metrics" style="margin-bottom:1rem"><div class="metric"><div class="metric-label">Total</div><div class="metric-value mv-brown">${brl(t)}</div></div><div class="metric"><div class="metric-label">Fornecedores</div><div class="metric-value">${fkeys.length}</div></div><div class="metric"><div class="metric-label">Compras</div><div class="metric-value">${list.length}</div></div></div>`+(fkeys.length?`<div class="card" style="margin-bottom:12px"><div class="card-title">Ranking</div><div class="chart-wrap" style="height:${Math.max(180,fkeys.length*40+60)}px"><canvas id="${cid}"></canvas></div></div>`:'')+'<div class="card">'+fkeys.map(fn=>{const pct=t>0?Math.round(byF[fn]/t*100):0;return`<div class="prog-bar"><div class="pb-label"><span style="font-weight:500">${fn}</span><span style="color:#888">${brl(byF[fn])} · ${pct}%</span></div><div class="pb-bg"><div class="pb-fill" style="width:${pct}%;background:#8B4513"></div></div></div>`}).join('')+'</div>';
  if(fkeys.length)setTimeout(()=>dChart(cid,'bar',{labels:fkeys,datasets:[{label:'R$',data:fkeys.map(fn=>byF[fn]),backgroundColor:'#8B4513',borderRadius:5,borderSkipped:false}]},{indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{ticks:{callback:v=>'R$'+(v/1000).toFixed(1)+'k',font:{size:10}},grid:{color:'rgba(0,0,0,.05)'}},y:{ticks:{font:{size:11}},grid:{display:false}}}}),80);
}
function renderRelForn(){_relForn('d-','d-chartForn')}
function renderMRelForn(){_relForn('m-','m-chartForn')}

function _relPer(prefix,cid){
  const mes=document.getElementById(prefix+'rel-mes').value,el=document.getElementById(prefix+'rel-per-c');
  let list=gastos; if(mes)list=list.filter(g=>g.data&&g.data.startsWith(mes));
  const t=tot(list),tmo=tot(list.filter(g=>g.categoria==='Mão de obra')),tmat=tot(list.filter(g=>g.categoria==='Materiais'));
  const byM={};list.forEach(g=>{const m=g.data.slice(0,7);byM[m]=(byM[m]||0)+(parseFloat(g.valor)||0)});const mkeys=Object.keys(byM).sort();
  el.innerHTML=relMetrics(t,tmo,tmat)+(mkeys.length>1?`<div class="card"><div class="card-title">Evolução mensal</div><div class="chart-wrap" style="height:190px"><canvas id="${cid}"></canvas></div></div>`:'');
  if(mkeys.length>1)setTimeout(()=>dChart(cid,'bar',{labels:mkeys.map(mesNome),datasets:[{label:'Total',data:mkeys.map(m=>byM[m]),backgroundColor:'#8B4513',borderRadius:5,borderSkipped:false}]},{plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>'R$'+(v/1000).toFixed(1)+'k',font:{size:10}},grid:{color:'rgba(0,0,0,.05)'}},x:{ticks:{font:{size:10},autoSkip:false,maxRotation:45},grid:{display:false}}}}),80);
}
function renderRelPer(){_relPer('d-','d-chartPer')}
function renderMRelPer(){_relPer('m-','m-chartPer')}

function _relMO(prefix,cid){
  const oid=document.getElementById(prefix+'rel-mo-obra').value,el=document.getElementById(prefix+'rel-mo-c');
  let list=oid?gastos.filter(g=>g.obra_id===oid):gastos;
  const tmo=tot(list.filter(g=>g.categoria==='Mão de obra')),tmat=tot(list.filter(g=>g.categoria==='Materiais')),tout=tot(list.filter(g=>g.categoria!=='Mão de obra'&&g.categoria!=='Materiais')),t=tmo+tmat+tout;
  const pmo=t>0?Math.round(tmo/t*100):0,pmat=t>0?Math.round(tmat/t*100):0,pout=100-pmo-pmat;
  el.innerHTML=`<div class="metrics" style="margin-bottom:1rem"><div class="metric"><div class="metric-label">Mão de obra</div><div class="metric-value mv-green">${brl(tmo)}</div></div><div class="metric"><div class="metric-label">Materiais</div><div class="metric-value mv-brown">${brl(tmat)}</div></div><div class="metric"><div class="metric-label">Outros</div><div class="metric-value">${brl(tout)}</div></div></div><div class="card" style="margin-bottom:12px"><div class="card-title">Proporção</div><div class="chart-wrap" style="height:190px"><canvas id="${cid}"></canvas></div></div><div class="card">${[['Mão de obra',tmo,pmo,'#2D6A2D'],['Materiais',tmat,pmat,'#8B4513'],['Outros',tout,pout,'#888']].map(([lb,vl,pt,cr])=>`<div class="prog-bar"><div class="pb-label"><span style="font-weight:500">${lb}</span><span style="color:#888">${brl(vl)} · ${pt}%</span></div><div class="pb-bg"><div class="pb-fill" style="width:${pt}%;background:${cr}"></div></div></div>`).join('')}</div>`;
  setTimeout(()=>dChart(cid,'doughnut',{labels:['Mão de obra','Materiais','Outros'],datasets:[{data:[tmo,tmat,tout],backgroundColor:['#2D6A2D','#8B4513','#888'],borderWidth:2}]},{plugins:{legend:{position:'bottom',labels:{font:{size:11},padding:12}}}}),80);
}
function renderRelMO(){_relMO('d-','d-chartMO')}
function renderMRelMO(){_relMO('m-','m-chartMO')}

// ── EXPORT CSV ────────────────────────────────────────────
function exportCSV(obraId) {
  const obra=obras.find(o=>o.id===obraId),list=gastos.filter(g=>g.obra_id===obraId);
  if(!list.length){alert('Sem gastos para exportar.');return}
  const rows=[['Data','Categoria','Fornecedor','Valor','Pagamento','NF','Descrição'],...list.map(g=>[g.data,g.categoria,g.fornecedor||'',parseFloat(g.valor).toFixed(2).replace('.',','),g.forma_pagamento||'',g.nf||'',(g.descricao||'').replace(/,/g,' ')])];
  const blob=new Blob(['\uFEFF'+rows.map(r=>r.join(',')).join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(obra?obra.nome:'obra')+'_gastos.csv';a.click();
}
