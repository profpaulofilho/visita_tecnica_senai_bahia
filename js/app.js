
const state={visits:[],specialists:[],filtered:[],markers:new Map(),route:null,selectedSpecialist:null};
let map;

const fmt=d=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));
const uniq=a=>[...new Set(a)].sort((a,b)=>a.localeCompare(b,'pt-BR'));

async function boot(){
  const [visits,specialists]=await Promise.all([fetch('data/visits.json').then(r=>r.json()),fetch('data/specialists.json').then(r=>r.json())]);
  state.visits=visits; state.specialists=specialists; state.filtered=[...visits];
  setupMap(); fillFilters(); renderSpecialists(); bind(); applyFilters();
}
function setupMap(){
  map=L.map('map',{zoomControl:true}).setView([-12.6,-41.5],6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
}
function fillFilters(){
  const city=document.querySelector('#cityFilter'), region=document.querySelector('#regionFilter');
  uniq(state.visits.map(v=>v.cidade)).forEach(x=>city.insertAdjacentHTML('beforeend',`<option>${x}</option>`));
  uniq(state.visits.map(v=>v.regiao)).forEach(x=>region.insertAdjacentHTML('beforeend',`<option>${x}</option>`));
}
function bind(){
  ['search','cityFilter','regionFilter','monthFilter'].forEach(id=>document.querySelector('#'+id).addEventListener(id==='search'?'input':'change',applyFilters));
  document.querySelector('#themeBtn').onclick=()=>{const html=document.documentElement;html.dataset.theme=html.dataset.theme==='dark'?'light':'dark'};
  document.querySelector('#closeDetails').onclick=()=>document.querySelector('.details').classList.remove('open');
}
function applyFilters(){
  const q=document.querySelector('#search').value.trim().toLowerCase();
  const city=document.querySelector('#cityFilter').value, region=document.querySelector('#regionFilter').value, month=document.querySelector('#monthFilter').value;
  state.filtered=state.visits.filter(v=>{
    const hay=[v.unidade,v.cidade,v.regiao,v.observacao,...v.areas].join(' ').toLowerCase();
    return (!q||hay.includes(q))&&(!city||v.cidade===city)&&(!region||v.regiao===region)&&(!month||v.inicio.slice(5,7)===month);
  });
  renderMarkers(); renderTimeline(); renderStats();
}
function renderMarkers(){
  state.markers.forEach(m=>map.removeLayer(m)); state.markers.clear();
  const group=[];
  state.filtered.forEach(v=>{
    const icon=L.divIcon({className:'',html:`<div style="width:30px;height:30px;border-radius:50%;background:${v.status.includes('não')?'#fd7e14':'#005ca9'};border:4px solid white;box-shadow:0 4px 12px #0004"></div>`,iconSize:[30,30],iconAnchor:[15,15]});
    const m=L.marker([v.lat,v.lng],{icon}).addTo(map);
    m.bindPopup(`<div class="popup-title">${v.unidade}</div><div class="popup-muted">${v.cidade} · ${fmt(v.inicio)}</div>`);
    m.on('click',()=>showDetails(v)); state.markers.set(v.id,m); group.push([v.lat,v.lng]);
  });
  if(group.length) map.fitBounds(group,{padding:[35,35],maxZoom:8});
}
function renderTimeline(){
  const el=document.querySelector('#timeline');
  el.innerHTML=state.filtered.sort((a,b)=>a.inicio.localeCompare(b.inicio)).map(v=>`<div class="timeline-item" data-id="${v.id}"><b>${v.cidade}</b><small>${fmt(v.inicio)} · ${v.unidade}</small></div>`).join('')||'<div class="empty">Nenhuma visita encontrada.</div>';
  el.querySelectorAll('.timeline-item').forEach(x=>x.onclick=()=>{const v=state.visits.find(v=>v.id===x.dataset.id);map.setView([v.lat,v.lng],10);state.markers.get(v.id)?.openPopup();showDetails(v)});
}
function renderStats(){
  document.querySelector('#totalVisits').textContent=state.filtered.length;
  document.querySelector('#totalCities').textContent=uniq(state.filtered.map(v=>v.cidade)).length;
  document.querySelector('#totalUnits').textContent=uniq(state.filtered.map(v=>v.unidade)).length;
  document.querySelector('#totalSpecialists').textContent=state.specialists.length;
}
function renderSpecialists(){
  const el=document.querySelector('#specialists');
  el.innerHTML=state.specialists.map(s=>`<button class="specialist" data-id="${s.id}"><img src="${s.avatar}" alt=""><span><b>${s.nome}</b><small>trilha aguardando vínculo</small></span></button>`).join('');
  el.querySelectorAll('.specialist').forEach(b=>b.onclick=()=>selectSpecialist(b.dataset.id));
}
function selectSpecialist(id){
  document.querySelectorAll('.specialist').forEach(x=>x.classList.toggle('active',x.dataset.id===id));
  const s=state.specialists.find(x=>x.id===id); state.selectedSpecialist=id;
  if(state.route){map.removeLayer(state.route);state.route=null}
  const route=state.visits.filter(v=>v.especialistas.includes(id)).sort((a,b)=>a.inicio.localeCompare(b.inicio));
  if(route.length>1){state.route=L.polyline(route.map(v=>[v.lat,v.lng]),{color:s.cor,weight:5,opacity:.8}).addTo(map);map.fitBounds(state.route.getBounds(),{padding:[30,30]})}
  document.querySelector('#routeStatus').textContent=route.length?`${route.length} visita(s) vinculada(s) a ${s.nome}.`:`${s.nome} ainda não possui visitas confirmadas na base.`;
}
function showDetails(v){
  const panel=document.querySelector('.details'); panel.classList.add('open');
  document.querySelector('#emptyDetail').style.display='none';
  const d=document.querySelector('#detailCard'); d.classList.add('show');
  document.querySelector('#detailTitle').textContent=v.unidade;
  document.querySelector('#detailBadge').textContent=v.status;
  document.querySelector('#detailCity').textContent=`${v.cidade} · ${v.regiao}`;
  document.querySelector('#detailDate').textContent=v.inicio===v.fim?fmt(v.inicio):`${fmt(v.inicio)} a ${fmt(v.fim)}`;
  document.querySelector('#detailAreas').textContent=v.areas.length?v.areas.join(', '):'Aguardando consolidação dos relatórios';
  document.querySelector('#detailObs').textContent=v.observacao||'Sem observação adicional.';
}
boot();
