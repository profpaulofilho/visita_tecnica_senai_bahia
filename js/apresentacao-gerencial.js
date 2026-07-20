(function () {
  "use strict";

  // Mesmas coordenadas/metadados de UNIT_META em lib/visitas.js — duplicado
  // aqui porque lib/visitas.js é um módulo CommonJS (roda no servidor) e esta
  // página roda só no navegador. Se uma unidade nova for adicionada em
  // lib/visitas.js, replique a linha aqui também.
  const UNIT_META = {
    "Dendezeiros": { cidade: "Salvador", regiao: "RMS", lat: -12.9718, lng: -38.5011 },
    "Lauro de Freitas": { cidade: "Lauro de Freitas", regiao: "RMS", lat: -12.8944, lng: -38.3272 },
    "Candeias": { cidade: "Candeias", regiao: "RMS", lat: -12.6716, lng: -38.5472 },
    "Camaçari": { cidade: "Camaçari", regiao: "RMS", lat: -12.6975, lng: -38.324 },
    "Teixeira de Freitas": { cidade: "Teixeira de Freitas", regiao: "Extremo Sul", lat: -17.5399, lng: -39.742 },
    "Eunápolis": { cidade: "Eunápolis", regiao: "Extremo Sul", lat: -16.3775, lng: -39.58 },
    "Ilhéus": { cidade: "Ilhéus", regiao: "Sul", lat: -14.7936, lng: -39.0466 },
    "Vitória da Conquista": { cidade: "Vitória da Conquista", regiao: "Sudoeste", lat: -14.8619, lng: -40.8448 },
    "Serrinha": { cidade: "Serrinha", regiao: "Nordeste", lat: -11.6642, lng: -39.0075 },
    "Barreiras": { cidade: "Barreiras", regiao: "Oeste", lat: -12.1528, lng: -44.99 },
    "Luís Eduardo Magalhães": { cidade: "Luís Eduardo Magalhães", regiao: "Oeste", lat: -12.0956, lng: -45.7866 },
    "Alagoinhas": { cidade: "Alagoinhas", regiao: "Litoral Norte", lat: -12.1356, lng: -38.4192 },
    "Feira de Santana": { cidade: "Feira de Santana", regiao: "Centro-Norte", lat: -12.2664, lng: -38.9663 },
    "Santo Antônio de Jesus": { cidade: "Santo Antônio de Jesus", regiao: "Recôncavo", lat: -12.9698, lng: -39.2619 },
    "Ourolândia": { cidade: "Ourolândia", regiao: "Centro-Norte", lat: -10.9581, lng: -41.0756 },
    "Jacobina": { cidade: "Jacobina", regiao: "Centro-Norte", lat: -11.1812, lng: -40.5117 },
    "Senhor do Bonfim": { cidade: "Senhor do Bonfim", regiao: "Centro-Norte", lat: -10.4594, lng: -40.1896 },
    "Juazeiro": { cidade: "Juazeiro", regiao: "Norte", lat: -9.4111, lng: -40.4986 },
    "Jequié": { cidade: "Jequié", regiao: "Sudoeste", lat: -13.8578, lng: -40.0839 },
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));

  const state = {
    unidades: [],
    consideracoesBase: [],
    consideracoesLive: null,
    overridesAreas: {},
    current: null,
    editMode: false,
    user: null,
    map: null,
    markers: new Map(),
  };

  async function api(path, opts) {
    const res = await fetch(path, Object.assign({ credentials: "include", headers: { "Content-Type": "application/json" } }, opts));
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.erro || "Erro na requisição.");
    return data;
  }

  function areaKey(unidadeChave, area) {
    return unidadeChave + "||" + area;
  }

  function resumoEfetivo(unidadeChave, area, baseResumo) {
    const ov = state.overridesAreas[areaKey(unidadeChave, area)];
    return ov ? ov.resumo : baseResumo;
  }

  function consideracoesEfetivas() {
    const porOrdem = new Map();
    state.consideracoesBase.forEach((c) => porOrdem.set(c.ordem, Object.assign({}, c)));
    (state.consideracoesLive || []).forEach((c) => porOrdem.set(c.ordem, Object.assign({}, c)));
    return Array.from(porOrdem.values())
      .filter((c) => c.ativo !== false)
      .sort((a, b) => a.ordem - b.ordem);
  }

  async function loadData() {
    const base = await fetch("data/resumo-gerencial.json", { cache: "no-store" }).then((r) => r.json());
    state.unidades = (base.unidades || []).sort((a, b) => a.ordem - b.ordem);
    state.consideracoesBase = base.consideracoesGerais || [];
    try {
      const live = await api("/api/resumo-gerencial-live");
      const overrides = {};
      (live.areas || []).forEach((a) => (overrides[areaKey(a.unidade_chave, a.area)] = { resumo: a.resumo }));
      state.overridesAreas = overrides;
      state.consideracoesLive = live.consideracoes || [];
    } catch (e) {
      console.warn("Edições ao vivo indisponíveis (normal fora do deploy da Vercel, ou antes da migração do banco).", e);
    }
  }

  async function checkSession() {
    try {
      const me = await api("/api/me");
      state.user = me;
    } catch (e) {
      state.user = null;
    }
    renderAuthUi();
  }

  function renderAuthUi() {
    const logged = !!state.user;
    $("#gLoginBtn").style.display = logged ? "none" : "inline-flex";
    $("#gUserBox").style.display = logged ? "flex" : "none";
    if (logged) $("#gUserName").textContent = state.user.nome;
    if (!logged && state.editMode) toggleEditMode(false);
    $("#gEditToggle").style.display = logged ? "inline-flex" : "none";
  }

  function renderKpis() {
    const totalUnidades = state.unidades.length;
    const pendentes = state.unidades.filter((u) => u.pendente).length;
    const totalAreas = state.unidades.reduce((acc, u) => acc + u.areas.length, 0);
    const regionais = new Set(state.unidades.map((u) => u.regional).filter(Boolean)).size;
    $("#kpiUnidades").textContent = totalUnidades;
    $("#kpiAreas").textContent = totalAreas;
    $("#kpiRegionais").textContent = regionais;
    $("#kpiPendentes").textContent = pendentes;
  }

  function markerColor(unidade) {
    if (unidade.pendente) return "#ff9800";
    return unidade.unidadeChave === (state.current && state.current.unidadeChave) ? "#00e0c6" : "#3aa0ff";
  }

  function renderMarkers() {
    state.markers.forEach((m) => state.map.removeLayer(m));
    state.markers.clear();
    state.unidades.forEach((u) => {
      const meta = UNIT_META[u.unidadeChave];
      if (!meta) return;
      const color = markerColor(u);
      const icon = L.divIcon({
        className: "g-marker-wrap",
        html: `<div class="g-marker" style="background:${color}">${escapeHtml((u.apelido || u.unidadeChave).slice(0, 2).toUpperCase())}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      const m = L.marker([meta.lat, meta.lng], { icon }).addTo(state.map);
      m.on("click", () => selectUnit(u.unidadeChave));
      state.markers.set(u.unidadeChave, m);
    });
  }

  function setupMap() {
    state.map = L.map("gMap", { zoomControl: true, minZoom: 5, maxZoom: 12 }).setView([-12.6, -41.7], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(state.map);
    fetch("https://servicodados.ibge.gov.br/api/v3/malhas/estados/29?formato=application/vnd.geo+json")
      .then((r) => r.json())
      .then((geo) => {
        const layer = L.geoJSON(geo, { style: { color: "#00e0c6", weight: 3, opacity: 0.9, fillColor: "#0066b3", fillOpacity: 0.06 } }).addTo(state.map);
        state.map.fitBounds(layer.getBounds(), { padding: [16, 16] });
      })
      .catch(() => state.map.fitBounds([[-18.35, -46.65], [-8.45, -37.25]], { padding: [16, 16] }));
  }

  function renderAreaCard(unidadeChave, item) {
    const resumo = resumoEfetivo(unidadeChave, item.area, item.resumo);
    const vazio = !resumo || !resumo.trim();
    if (state.editMode) {
      return `<div class="g-area-card">
        <div class="g-area-title">${escapeHtml(item.area)}</div>
        <textarea class="g-area-edit" data-area="${escapeHtml(item.area)}">${escapeHtml(resumo)}</textarea>
        <button class="g-save-btn" data-unidade="${escapeHtml(unidadeChave)}" data-area="${escapeHtml(item.area)}">Salvar</button>
        <span class="g-save-status" data-area-status="${escapeHtml(item.area)}"></span>
      </div>`;
    }
    return `<div class="g-area-card">
      <div class="g-area-title">${escapeHtml(item.area)}</div>
      <p class="g-area-text${vazio ? " g-area-empty" : ""}">${vazio ? "Resumo ainda não preenchido." : escapeHtml(resumo)}</p>
    </div>`;
  }

  function selectUnit(unidadeChave) {
    const u = state.unidades.find((x) => x.unidadeChave === unidadeChave);
    if (!u) return;
    state.current = u;
    const meta = UNIT_META[unidadeChave];
    if (meta && state.map) state.map.flyTo([meta.lat, meta.lng], 8, { duration: 0.6 });
    renderMarkers();
    renderPanel();
    updateHash();
  }

  function renderPanel() {
    const u = state.current;
    if (!u) {
      $("#gPanel").innerHTML = `<div class="g-empty">Clique em uma unidade no mapa ou use "Próxima" para começar a apresentação.</div>`;
      return;
    }
    const meta = UNIT_META[u.unidadeChave] || {};
    const pendenteBadge = u.pendente ? `<span class="g-badge g-badge-pendente">Pendente de conteúdo completo</span>` : `<span class="g-badge">Completo</span>`;
    const pendenteNote = u.pendente && u.pendenteMotivo ? `<p class="g-pendente-note">${escapeHtml(u.pendenteMotivo)}</p>` : "";
    $("#gPanel").innerHTML = `
      <div class="g-panel-head">
        <div>
          <div class="g-panel-eyebrow">${escapeHtml(u.regional || meta.regiao || "")}${u.apelido ? " · " + escapeHtml(u.apelido) : ""}</div>
          <h2>${escapeHtml(u.unidadeChave)}</h2>
          <div class="g-panel-sub">${escapeHtml(meta.cidade || "")} · Visita: ${escapeHtml(u.dataVisita || "")}</div>
        </div>
        ${pendenteBadge}
      </div>
      ${pendenteNote}
      <div class="g-area-grid">${u.areas.map((a) => renderAreaCard(u.unidadeChave, a)).join("")}</div>
    `;
    if (state.editMode) bindAreaSaveButtons();
  }

  function bindAreaSaveButtons() {
    $$(".g-save-btn").forEach((btn) => {
      btn.onclick = async () => {
        const unidadeChave = btn.dataset.unidade;
        const area = btn.dataset.area;
        const textarea = $(`.g-area-edit[data-area="${CSS.escape(area)}"]`);
        const statusEl = $(`[data-area-status="${CSS.escape(area)}"]`);
        const resumo = textarea.value.trim();
        statusEl.textContent = "Salvando…";
        try {
          await api("/api/salvar-resumo-gerencial", { method: "POST", body: JSON.stringify({ tipo: "area", unidadeChave, area, resumo }) });
          state.overridesAreas[areaKey(unidadeChave, area)] = { resumo };
          statusEl.textContent = "Salvo ✓";
          setTimeout(() => (statusEl.textContent = ""), 2000);
        } catch (e) {
          statusEl.textContent = "Erro: " + e.message;
        }
      };
    });
  }

  function unitIndex() {
    return state.current ? state.unidades.findIndex((u) => u.unidadeChave === state.current.unidadeChave) : -1;
  }

  function goPrev() {
    const idx = unitIndex();
    const next = idx <= 0 ? state.unidades.length - 1 : idx - 1;
    selectUnit(state.unidades[next].unidadeChave);
  }
  function goNext() {
    const idx = unitIndex();
    const next = idx === -1 || idx === state.unidades.length - 1 ? 0 : idx + 1;
    selectUnit(state.unidades[next].unidadeChave);
  }

  function renderConsideracoes() {
    const lista = consideracoesEfetivas();
    const itemsHtml = lista.map((c) => {
      if (state.editMode) {
        return `<div class="g-consid-item">
          <textarea class="g-consid-edit" data-ordem="${c.ordem}">${escapeHtml(c.texto)}</textarea>
          <div class="g-consid-actions">
            <button class="g-save-btn" data-consid-save="${c.ordem}">Salvar</button>
            <button class="g-remove-btn" data-consid-remove="${c.ordem}" title="Ocultar este item (soft delete)">Remover</button>
            <span class="g-save-status" data-consid-status="${c.ordem}"></span>
          </div>
        </div>`;
      }
      return `<li>${escapeHtml(c.texto)}</li>`;
    }).join("");
    $("#gConsideracoesBody").innerHTML = state.editMode
      ? `<div class="g-consid-list">${itemsHtml}</div>
         <div class="g-consid-new">
           <textarea id="gConsidNovaTexto" placeholder="Nova consideração / ação futura…"></textarea>
           <button class="g-save-btn" id="gConsidNovaSalvar">+ Adicionar</button>
           <span class="g-save-status" id="gConsidNovaStatus"></span>
         </div>`
      : `<ul class="g-consid-static">${itemsHtml}</ul>`;
    if (state.editMode) bindConsideracoesButtons();
  }

  function bindConsideracoesButtons() {
    $$("[data-consid-save]").forEach((btn) => {
      btn.onclick = async () => {
        const ordem = Number(btn.dataset.considSave);
        const textarea = $(`.g-consid-edit[data-ordem="${ordem}"]`);
        const statusEl = $(`[data-consid-status="${ordem}"]`);
        const texto = textarea.value.trim();
        if (!texto) return;
        statusEl.textContent = "Salvando…";
        try {
          const r = await api("/api/salvar-resumo-gerencial", { method: "POST", body: JSON.stringify({ tipo: "consideracao", ordem, texto }) });
          upsertConsideracaoLive(r.item);
          statusEl.textContent = "Salvo ✓";
          setTimeout(() => (statusEl.textContent = ""), 2000);
        } catch (e) {
          statusEl.textContent = "Erro: " + e.message;
        }
      };
    });
    $$("[data-consid-remove]").forEach((btn) => {
      btn.onclick = async () => {
        const ordem = Number(btn.dataset.considRemove);
        const atual = consideracoesEfetivas().find((c) => c.ordem === ordem);
        if (!atual) return;
        if (!confirm("Remover esta consideração da apresentação?")) return;
        try {
          const r = await api("/api/salvar-resumo-gerencial", { method: "POST", body: JSON.stringify({ tipo: "consideracao", ordem, texto: atual.texto, ativo: false }) });
          upsertConsideracaoLive(r.item);
          renderConsideracoes();
        } catch (e) {
          alert("Erro ao remover: " + e.message);
        }
      };
    });
    const btnNova = $("#gConsidNovaSalvar");
    if (btnNova) {
      btnNova.onclick = async () => {
        const textarea = $("#gConsidNovaTexto");
        const statusEl = $("#gConsidNovaStatus");
        const texto = textarea.value.trim();
        if (!texto) return;
        statusEl.textContent = "Salvando…";
        try {
          const r = await api("/api/salvar-resumo-gerencial", { method: "POST", body: JSON.stringify({ tipo: "consideracao", texto }) });
          upsertConsideracaoLive(r.item);
          textarea.value = "";
          statusEl.textContent = "";
          renderConsideracoes();
        } catch (e) {
          statusEl.textContent = "Erro: " + e.message;
        }
      };
    }
  }

  function upsertConsideracaoLive(item) {
    if (!item) return;
    state.consideracoesLive = state.consideracoesLive || [];
    const idx = state.consideracoesLive.findIndex((c) => c.ordem === item.ordem);
    if (idx >= 0) state.consideracoesLive[idx] = item;
    else state.consideracoesLive.push(item);
  }

  function toggleEditMode(force) {
    state.editMode = typeof force === "boolean" ? force : !state.editMode;
    $("#gEditToggle").textContent = state.editMode ? "✓ Modo edição ativo" : "✎ Modo edição";
    $("#gEditToggle").classList.toggle("g-active", state.editMode);
    renderPanel();
    renderConsideracoes();
  }

  function updateHash() {
    if (state.current) history.replaceState(null, "", "#" + encodeURIComponent(state.current.unidadeChave));
  }

  function openConsideracoesModal() {
    renderConsideracoes();
    $("#gConsidModal").classList.add("open");
  }
  function closeConsideracoesModal() {
    $("#gConsidModal").classList.remove("open");
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      $("#gApp").classList.add("g-presenting");
    } else {
      document.exitFullscreen().catch(() => {});
      $("#gApp").classList.remove("g-presenting");
    }
  }

  function bindUi() {
    $("#gPrevBtn").onclick = goPrev;
    $("#gNextBtn").onclick = goNext;
    $("#gConsidBtn").onclick = openConsideracoesModal;
    $("#gConsidClose").onclick = closeConsideracoesModal;
    $("#gConsidModal").addEventListener("click", (e) => { if (e.target.id === "gConsidModal") closeConsideracoesModal(); });
    $("#gFullscreenBtn").onclick = toggleFullscreen;
    $("#gEditToggle").onclick = () => toggleEditMode();
    $("#gLoginBtn").onclick = () => $("#gLoginModal").classList.add("open");
    $("#gLoginClose").onclick = () => $("#gLoginModal").classList.remove("open");
    $("#gLoginModal").addEventListener("click", (e) => { if (e.target.id === "gLoginModal") $("#gLoginModal").classList.remove("open"); });
    $("#gLoginSubmit").onclick = async () => {
      const email = $("#gLoginEmail").value.trim();
      const senha = $("#gLoginSenha").value;
      const msg = $("#gLoginMsg");
      msg.style.display = "none";
      try {
        await api("/api/login", { method: "POST", body: JSON.stringify({ email, senha }) });
        await checkSession();
        $("#gLoginModal").classList.remove("open");
      } catch (e) {
        msg.textContent = e.message;
        msg.style.display = "block";
      }
    };
    $("#gLogoutBtn").onclick = async () => {
      try { await api("/api/logout", { method: "POST" }); } catch (e) {}
      state.user = null;
      toggleEditMode(false);
      renderAuthUi();
    };
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") { closeConsideracoesModal(); $("#gLoginModal").classList.remove("open"); }
    });
  }

  async function boot() {
    await loadData();
    renderKpis();
    setupMap();
    renderMarkers();
    bindUi();
    await checkSession();
    const fromHash = decodeURIComponent(location.hash.replace("#", ""));
    const initial = state.unidades.find((u) => u.unidadeChave === fromHash) || null;
    if (initial) selectUnit(initial.unidadeChave);
    else renderPanel();
    renderConsideracoes();
  }

  boot();
})();
