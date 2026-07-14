
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
  const linked=(v.especialistas||[])
    .map(id=>state.specialists.find(s=>s.id===id))
    .filter(Boolean);

  if(!linked.length){
    return `<span class="unit-hover-label">Especialistas</span>
      <div class="marker-pending">
        <span class="marker-pending-icon">?</span>
        <span>Participação nominal ainda não confirmada para esta visita.</span>
      </div>`;
  }

  const visible=linked.slice(0,5);
  const remaining=linked.length-visible.length;
  const avatars=visible.map(s=>`
    <img class="marker-avatar"
      src="${escapeHtml(s.avatar)}"
      alt="${escapeHtml(s.nome)}"
      title="${escapeHtml(s.nome)}">`).join('');

  return `<span class="unit-hover-label">${linked.length===1?'Especialista':'Especialistas'} da visita</span>
    <div class="marker-avatar-stack">
      ${avatars}
      ${remaining>0?`<span class="marker-avatar-more">+${remaining}</span>`:''}
    </div>`;
}

function markerHtml(v,color){
  const initials=v.cidade.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
  return `<div class="unit-hover-marker">
    <div class="unit-dot" style="background:${color}">${escapeHtml(initials)}</div>
    <div class="unit-hover-card">
      <span class="unit-hover-title">${escapeHtml(v.unidade)}</span>
      <span class="unit-hover-city">${escapeHtml(v.cidade)} · ${period(v.inicio,v.fim)}</span>
      ${specialistMarkup(v)}
    </div>
  </div>`;
}

function renderMarkers(){
  state.markers.forEach(m=>map.removeLayer(m));state.markers.clear();
  state.filtered.forEach(v=>{
    const color=v.status.includes('não')?'#ff7a00':'#0066b3';
    const icon=L.divIcon({
      className:'specialist-unit-icon',
      html:markerHtml(v,color),
      iconSize:[34,34],
      iconAnchor:[17,17]
    });
    const m=L.marker([v.lat,v.lng],{icon,riseOnHover:true,riseOffset:1200}).addTo(map);
    m.bindPopup(`<div class="popup-title">${escapeHtml(v.unidade)}</div><div class="popup-muted">${escapeHtml(v.cidade)} · ${period(v.inicio,v.fim)}</div><div class="popup-muted">${(v.relatorios||[]).length} documento(s) identificado(s)</div>`);
    m.on('mouseover',function(){
      const el=this.getElement()?.querySelector('.unit-hover-marker');
      el?.classList.add('is-hovered');
    });
    m.on('mouseout',function(){
      const el=this.getElement()?.querySelector('.unit-hover-marker');
      el?.classList.remove('is-hovered');
    });
    m.on('click',()=>showDetails(v));state.markers.set(v.id,m);
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
  const linked=(v.especialistas||[]).map(id=>state.specialists.find(s=>s.id===id)).filter(Boolean);
  if(!linked.length){
    container.innerHTML='<div class="detail-no-specialist">A participação nominal dos especialistas ainda não foi confirmada para esta visita.</div>';
    $('#specialistProfileSection').style.display='none';
    $('#areaResultSection').style.display='none';
    return;
  }
  container.innerHTML=linked.map(s=>`<button class="detail-specialist-btn" data-id="${s.id}">
    <img src="${escapeHtml(s.avatar)}" alt="${escapeHtml(s.nome)}">
    <span><b>${escapeHtml(s.nome)}</b><small>${(s.areas_atuacao||[]).length} área(s) confirmada(s)</small></span>
  </button>`).join('');
  container.querySelectorAll('.detail-specialist-btn').forEach(btn=>{
    btn.onclick=()=>showSpecialistInVisit(v,btn.dataset.id);
  });
}

function showSpecialistInVisit(v,specialistId){
  const s=state.specialists.find(x=>x.id===specialistId);
  if(!s)return;
  state.currentDetailSpecialist=specialistId;
  document.querySelectorAll('.detail-specialist-btn').forEach(x=>x.classList.toggle('active',x.dataset.id===specialistId));
  $('#specialistProfileSection').style.display='block';
  $('#specialistProfile').innerHTML=`<img src="${escapeHtml(s.avatar)}" alt="${escapeHtml(s.nome)}">
    <div><h4>${escapeHtml(s.nome)}</h4>
    <p>${escapeHtml(s.resumo_profissional||'')}</p>
    <p><b>Status:</b> ${escapeHtml(s.areas_status||'Em validação')}</p></div>`;

  const visitAreas=Object.keys(v.resultados_por_area||{});
  const specialistAreas=(s.areas_atuacao||[]).filter(a=>visitAreas.includes(a));
  const select=$('#specialistAreaSelect');

  if(!specialistAreas.length){
    select.innerHTML='<option value="">Nenhuma área confirmada para este especialista nesta visita</option>';
    select.disabled=true;
    $('#areaResultSection').style.display='none';
    return;
  }

  select.disabled=false;
  select.innerHTML='<option value="">Selecione uma área</option>'+specialistAreas.map(a=>`<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
  select.onchange=()=>renderAreaResult(v,select.value);
  $('#areaResultSection').style.display='none';
}

function renderAreaResult(v,area){
  if(!area){$('#areaResultSection').style.display='none';return}
  const result=(v.resultados_por_area||{})[area];
  if(!result){$('#areaResultSection').style.display='none';return}
  $('#areaResultSection').style.display='block';
  $('#areaResultStatus').textContent=result.status||'Em consolidação';
  $('#areaResultSummary').textContent=result.resumo||'Sem resumo consolidado.';
  $('#areaResultKpis').innerHTML=(result.indicadores||[]).map(k=>`<div class="mini-kpi"><b>${escapeHtml(k.valor)}</b><small>${escapeHtml(k.rotulo)}</small></div>`).join('');
  $('#areaResultGood').textContent=result.boas_praticas||'Não consolidado.';
  $('#areaResultOpportunities').textContent=result.oportunidades||'Não consolidado.';
  $('#areaResultRecommendations').textContent=result.recomendacoes||'Não consolidado.';
}

function showDetails(v){
  state.currentVisit=v;
  const panel=$('.details');panel.classList.add('open');$('#emptyDetail').style.display='none';$('#detailCard').classList.add('show');
  $('#detailTitle').textContent=v.unidade;$('#detailBadge').textContent=v.status;$('#detailCity').textContent=`${v.cidade} · ${v.regiao}`;
  $('#detailRealizada').textContent=period(v.inicio,v.fim);
  $('#detailProgramada').textContent=v.data_programada_inicio?period(v.data_programada_inicio,v.data_programada_fim):'Não localizada na programação';
  $('#detailAreas').textContent=(v.areas||[]).length?v.areas.join(', '):'Áreas registradas no relatório; consolidação detalhada em andamento';
  $('#detailResumo').textContent=v.resumo||'Sem resumo.';
  $('#detailObs').textContent=v.observacao||'Sem observação adicional.';
  $('#detailBoas').textContent=v.boas_praticas||'Não consolidado.';
  $('#detailOportunidades').textContent=v.oportunidades||'Não consolidado.';
  $('#detailRecomendacoes').textContent=v.recomendacoes||'Não consolidado.';
  $('#detailDataStatus').textContent=v.status_dados||'Em validação';
  $('#detailSpecialists').textContent=v.especialistas_status||'Em validação';
  const docs=v.relatorios||[];
  $('#detailDocs').innerHTML=docs.length?docs.map(d=>`<div class="doc"><b>${escapeHtml(d.tipo)}</b><small>${escapeHtml(d.arquivo)}</small></div>`).join(''):'<div class="empty">Nenhum documento vinculado.</div>';
  const indicators=Object.entries(v.indicadores||{});
  $('#detailKpis').innerHTML=indicators.length?indicators.map(([k,val])=>`<div class="mini-kpi"><b>${val}</b><small>${escapeHtml(k.replaceAll('_',' '))}</small></div>`).join(''):'';
  $('#detailKpisSection').style.display=indicators.length?'block':'none';
  $('#specialistProfileSection').style.display='none';
  $('#areaResultSection').style.display='none';
  renderVisitSpecialists(v);
}
boot();
