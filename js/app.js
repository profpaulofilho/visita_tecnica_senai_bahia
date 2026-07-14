
const state={visits:[],specialists:[],filtered:[],markers:new Map(),route:null,selectedSpecialist:null,bahiaLayer:null,currentVisit:null,currentDetailSpecialist:null};
let map;
const $=s=>document.querySelector(s);
const fmt=d=>d?new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z')):'Não informado';
const period=(a,b)=>a===b?fmt(a):`${fmt(a)} a ${fmt(b)}`;
const uniq=a=>[...new Set(a.filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

async function loadData(){
  try{
    const [visits,specialists]=await Promise.all([
      fetch('./data/visits.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('visits.json');return r.json()}),
      fetch('./data/specialists.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('specialists.json');return r.json()})
    ]);
    return {visits,specialists};
  }catch(err){
    $('#dataAlert').style.display='block';
    console.warn('Falha ao carregar JSON; usando base interna.',err);
    return window.APP_FALLBACK_DATA;
  }
}
async function boot(){
  const data=await loadData();
  state.visits=data.visits||[];state.specialists=data.specialists||[];state.filtered=[...state.visits];
  setupMap();await addBahiaBoundary();fillFilters();renderSpecialists();bind();applyFilters();
}
function setupMap(){
  map=L.map('map',{zoomControl:true,minZoom:5,maxZoom:13,maxBounds:[[-19.5,-47.5],[-7.5,-36.0]],maxBoundsViscosity:.85}).setView([-12.6,-41.7],6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
}
async function addBahiaBoundary(){
  try{
    const r=await fetch('https://servicodados.ibge.gov.br/api/v3/malhas/estados/29?formato=application/vnd.geo+json');
    if(!r.ok)throw new Error('IBGE');
    const geo=await r.json();
    state.bahiaLayer=L.geoJSON(geo,{style:{color:'#00a3e0',weight:4,opacity:.95,fillColor:'#0066b3',fillOpacity:.10,dashArray:'8 5'}}).addTo(map);
    map.fitBounds(state.bahiaLayer.getBounds(),{padding:[18,18]});
  }catch(e){console.warn('Contorno do IBGE indisponível.',e);map.fitBounds([[-18.35,-46.65],[-8.45,-37.25]],{padding:[18,18]})}
}
function fillFilters(){
  uniq(state.visits.map(v=>v.cidade)).forEach(x=>$('#cityFilter').insertAdjacentHTML('beforeend',`<option>${escapeHtml(x)}</option>`));
  uniq(state.visits.map(v=>v.regiao)).forEach(x=>$('#regionFilter').insertAdjacentHTML('beforeend',`<option>${escapeHtml(x)}</option>`));
}
function bind(){
  ['search','cityFilter','regionFilter','monthFilter'].forEach(id=>$('#'+id).addEventListener(id==='search'?'input':'change',applyFilters));
  $('#themeBtn').onclick=()=>{const html=document.documentElement;html.dataset.theme=html.dataset.theme==='dark'?'light':'dark';localStorage.setItem('theme',html.dataset.theme)};
  $('#closeDetails').onclick=()=>$('.details').classList.remove('open');
  const saved=localStorage.getItem('theme');if(saved)document.documentElement.dataset.theme=saved;
}
function applyFilters(){
  const q=$('#search').value.trim().toLowerCase(),city=$('#cityFilter').value,region=$('#regionFilter').value,month=$('#monthFilter').value;
  state.filtered=state.visits.filter(v=>{
    const docs=(v.relatorios||[]).map(d=>d.arquivo).join(' ');
    const hay=[v.unidade,v.cidade,v.regiao,v.observacao,v.resumo,docs,...(v.areas||[])].join(' ').toLowerCase();
    return(!q||hay.includes(q))&&(!city||v.cidade===city)&&(!region||v.regiao===region)&&(!month||v.inicio.slice(5,7)===month);
  });
  renderMarkers();renderTimeline();renderStats();
}
function specialistMarkup(v){
  const people=v.visitantes||[];
  if(!people.length){
    return `<span class="unit-hover-label">Quem visitou</span>
      <div class="marker-pending"><span class="marker-pending-icon">?</span><span>Não informado no relatório válido.</span></div>`;
  }
  const visible=people.slice(0,6);
  const remaining=people.length-visible.length;
  const avatars=visible.map(p=>{
    if(p.avatar) return `<img class="marker-avatar" src="${escapeHtml(p.avatar)}" alt="${escapeHtml(p.nome)}" title="${escapeHtml(p.nome)}">`;
    const ini=p.nome.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
    return `<span class="marker-avatar marker-initial" title="${escapeHtml(p.nome)}">${escapeHtml(ini)}</span>`;
  }).join('');
  return `<span class="unit-hover-label">Quem visitou · ${people.length}</span>
    <div class="marker-avatar-stack">${avatars}${remaining>0?`<span class="marker-avatar-more">+${remaining}</span>`:''}</div>`;
}

function markerHtml(v,color){
  const initials=v.cidade.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
  const featured=(v.visitantes||[]).find(p=>p.avatar);
  const dot=featured
    ? `<div class="unit-dot avatar-dot" style="border-color:${color}"><img src="${escapeHtml(featured.avatar)}" alt="${escapeHtml(featured.nome)}"></div>`
    : `<div class="unit-dot" style="background:${color}">${escapeHtml(initials)}</div>`;
  return `<div class="unit-hover-marker">
    ${dot}
    <div class="unit-hover-card">
      <span class="unit-hover-title">${escapeHtml(v.unidade)}</span>
      <span class="unit-hover-city">${escapeHtml(v.cidade)} · ${period(v.inicio,v.fim)}</span>
      ${specialistMarkup(v)}
      <span class="unit-hover-city" style="margin-top:7px">${(v.areas||[]).length} área(s) · ${(v.acompanhantes||[]).length} acompanhante(s)</span>
    </div>
  </div>`;
}

function renderMarkers(){
  state.markers.forEach(m=>map.removeLayer(m));state.markers.clear();
  state.filtered.forEach(v=>{
    const color=v.status.includes('não')?'#ff7a00':'#0066b3';
    const icon=L.divIcon({className:'specialist-unit-icon',html:markerHtml(v,color),iconSize:[38,38],iconAnchor:[19,19]});
    const m=L.marker([v.lat,v.lng],{icon,riseOnHover:true,riseOffset:1200}).addTo(map);
    m.bindPopup(`<div class="popup-title">${escapeHtml(v.unidade)}</div>
      <div class="popup-muted">${escapeHtml(v.cidade)} · ${period(v.inicio,v.fim)}</div>
      <div class="popup-muted">${(v.visitantes||[]).length} visitante(s) · ${(v.areas||[]).length} área(s)</div>`);
    m.on('mouseover',function(){this.getElement()?.querySelector('.unit-hover-marker')?.classList.add('is-hovered')});
    m.on('mouseout',function(){this.getElement()?.querySelector('.unit-hover-marker')?.classList.remove('is-hovered')});
    m.on('click',()=>{map.setView([v.lat,v.lng],9,{animate:true});showDetails(v)});
    state.markers.set(v.id,m);
  });
}
function renderTimeline(){
  const list=[...state.filtered].sort((a,b)=>a.inicio.localeCompare(b.inicio));
  $('#timeline').innerHTML=list.map(v=>`<button class="timeline-item" data-id="${v.id}"><b>${escapeHtml(v.cidade)}</b><small>${period(v.inicio,v.fim)} · ${escapeHtml(v.unidade)}</small></button>`).join('')||'<div class="empty">Nenhuma visita encontrada.</div>';
  document.querySelectorAll('.timeline-item').forEach(x=>x.onclick=()=>focusVisit(x.dataset.id));
}
function focusVisit(id){
  const v=state.visits.find(v=>v.id===id);if(!v)return;
  map.setView([v.lat,v.lng],10);state.markers.get(v.id)?.openPopup();showDetails(v);
}
function renderStats(){
  $('#totalVisits').textContent=state.filtered.length;
  $('#totalCities').textContent=uniq(state.filtered.map(v=>v.cidade)).length;
  $('#totalUnits').textContent=uniq(state.filtered.map(v=>v.unidade)).length;
  $('#totalSpecialists').textContent=state.specialists.length;
}
function renderSpecialists(){
  $('#specialists').innerHTML=state.specialists.map(s=>`<button class="specialist" data-id="${s.id}"><img src="${s.avatar}" alt="Avatar de ${escapeHtml(s.nome)}"><span><b>${escapeHtml(s.nome)}</b><small>trilha aguardando vínculo confirmado</small></span></button>`).join('');
  document.querySelectorAll('.specialist').forEach(b=>b.onclick=()=>selectSpecialist(b.dataset.id));
}
function selectSpecialist(id){
  document.querySelectorAll('.specialist').forEach(x=>x.classList.toggle('active',x.dataset.id===id));
  const s=state.specialists.find(x=>x.id===id);state.selectedSpecialist=id;
  if(state.route){map.removeLayer(state.route);state.route=null}
  const route=state.visits.filter(v=>(v.especialistas||[]).includes(id)).sort((a,b)=>a.inicio.localeCompare(b.inicio));
  if(route.length>1){state.route=L.polyline(route.map(v=>[v.lat,v.lng]),{color:s.cor,weight:5,opacity:.85}).addTo(map);map.fitBounds(state.route.getBounds(),{padding:[35,35]})}
  $('#routeStatus').textContent=route.length?`${route.length} visita(s) confirmada(s) para ${s.nome}.`:`${s.nome}: a base ainda não confirma nominalmente a participação por visita.`;
}
function renderVisitSpecialists(v){
  const container=$('#detailSpecialistAvatars');
  const people=v.visitantes||[];
  if(!people.length){
    container.innerHTML='<div class="detail-no-specialist">Nenhum participante foi informado nas abas válidas deste relatório.</div>';
    $('#specialistProfileSection').style.display='none';
    $('#areaResultSection').style.display='none';
    return;
  }
  container.innerHTML=people.map(p=>{
    const visual=p.avatar
      ? `<img src="${escapeHtml(p.avatar)}" alt="${escapeHtml(p.nome)}">`
      : `<span class="person-initial">${escapeHtml(p.nome.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase())}</span>`;
    return `<button class="detail-specialist-btn" data-id="${escapeHtml(p.id)}">${visual}
      <span><b>${escapeHtml(p.nome)}</b><small>${(p.areas||[]).length} área(s) registrada(s)</small></span></button>`;
  }).join('');
  container.querySelectorAll('.detail-specialist-btn').forEach(btn=>btn.onclick=()=>showSpecialistInVisit(v,btn.dataset.id));
}

function showSpecialistInVisit(v,personId){
  const p=(v.visitantes||[]).find(x=>x.id===personId);
  if(!p)return;
  state.currentDetailSpecialist=personId;
  document.querySelectorAll('.detail-specialist-btn').forEach(x=>x.classList.toggle('active',x.dataset.id===personId));
  $('#specialistProfileSection').style.display='block';
  const visual=p.avatar
    ? `<img src="${escapeHtml(p.avatar)}" alt="${escapeHtml(p.nome)}">`
    : `<span class="profile-initial">${escapeHtml(p.nome.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase())}</span>`;
  $('#specialistProfile').innerHTML=`${visual}<div><h4>${escapeHtml(p.nome)}</h4>
    <p>Registro obtido no campo <b>PARTICIPANTES</b> do relatório da unidade.</p>
    <p><b>Áreas vinculadas:</b> ${(p.areas||[]).length}</p></div>`;

  const areas=(p.areas||[]).filter(a=>(v.resultados_por_area||{})[a]);
  const select=$('#specialistAreaSelect');
  if(!areas.length){
    select.innerHTML='<option value="">Nenhuma área vinculada</option>';select.disabled=true;
    $('#areaResultSection').style.display='none';return;
  }
  select.disabled=false;
  select.innerHTML='<option value="">Selecione uma área</option>'+areas.map(a=>`<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
  select.onchange=()=>renderAreaResult(v,select.value);
  $('#areaResultSection').style.display='none';
}

function renderAreaResult(v,area){
  if(!area){$('#areaResultSection').style.display='none';return}
  const r=(v.resultados_por_area||{})[area];
  if(!r){$('#areaResultSection').style.display='none';return}
  const list=(arr,empty='Não registrado no relatório.')=>(arr&&arr.length)
    ? `<ul class="result-list">${arr.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`
    : `<span class="muted-result">${empty}</span>`;
  $('#areaResultSection').style.display='block';
  $('#areaResultStatus').textContent=r.status||'Extraído do relatório';
  $('#areaResultSummary').textContent=r.resumo||'Sem resumo.';
  $('#areaResultKpis').innerHTML=(r.indicadores||[]).map(k=>`<div class="mini-kpi"><b>${escapeHtml(k.valor)}</b><small>${escapeHtml(k.rotulo)}</small></div>`).join('');
  $('#areaResultPoints').innerHTML=list(r.principais_pontos);
  $('#areaResultGood').innerHTML=list(r.boas_praticas);
  $('#areaResultOpportunities').innerHTML=list(r.oportunidades);
  $('#areaResultObservations').innerHTML=list(r.observacoes);
  $('#areaResultResponsible').innerHTML=list(r.responsaveis);
  $('#areaResultDeadlines').innerHTML=list(r.prazos);
  $('#areaResultItems').innerHTML=(r.itens||[]).length
    ? (r.itens||[]).map((it,i)=>`<details class="technical-item"><summary>Item ${i+1}${it.descricao?' · '+escapeHtml(it.descricao):''}</summary>
      ${it.observado?`<p><b>Observado:</b> ${escapeHtml(it.observado)}</p>`:''}
      ${it.boa_pratica?`<p><b>Boa prática:</b> ${escapeHtml(it.boa_pratica)}</p>`:''}
      ${it.oportunidade?`<p><b>Oportunidade:</b> ${escapeHtml(it.oportunidade)}</p>`:''}
      ${it.acompanhado_por?`<p><b>Acompanhado por:</b> ${escapeHtml(it.acompanhado_por)}</p>`:''}
      ${it.responsavel?`<p><b>Responsável:</b> ${escapeHtml(it.responsavel)}</p>`:''}
      ${it.prazo?`<p><b>Prazo:</b> ${escapeHtml(it.prazo)}</p>`:''}
    </details>`).join('')
    : '<span class="muted-result">Nenhum item detalhado.</span>';
}

function showDetails(v){
  state.currentVisit=v;
  const panel=$('.details');panel.classList.add('open');$('#emptyDetail').style.display='none';$('#detailCard').classList.add('show');
  $('#detailTitle').textContent=v.unidade;$('#detailBadge').textContent=v.status;$('#detailCity').textContent=`${v.cidade} · ${v.regiao}`;
  $('#detailRealizada').textContent=period(v.inicio,v.fim);
  $('#detailProgramada').textContent=v.data_programada_inicio?period(v.data_programada_inicio,v.data_programada_fim):'Não localizada na programação';
  $('#detailAreas').textContent=(v.areas||[]).join(', ')||'Nenhuma área válida extraída.';
  $('#detailResumo').textContent=v.resumo||'Sem resumo.';
  $('#detailAccompanied').innerHTML=(v.acompanhantes||[]).length
    ? `<ul class="people-list">${v.acompanhantes.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`
    : '<span class="muted-result">Não informado na coluna ACOMPANHADO POR.</span>';
  $('#detailDataStatus').textContent=v.status_dados||'Em validação';
  $('#detailSpecialists').textContent=v.especialistas_status||'Em validação';
  const docs=(v.fontes_dados||[]).map(x=>({tipo:'Fonte analisada',arquivo:x}));
  $('#detailDocs').innerHTML=docs.length?docs.map(d=>`<div class="doc"><b>${escapeHtml(d.tipo)}</b><small>${escapeHtml(d.arquivo)}</small></div>`).join(''):'<div class="empty">Nenhuma fonte vinculada.</div>';
  $('#specialistProfileSection').style.display='none';$('#areaResultSection').style.display='none';
  renderVisitSpecialists(v);
}
boot();
