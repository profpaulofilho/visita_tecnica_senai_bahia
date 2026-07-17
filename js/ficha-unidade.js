(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
  const fmt = (d) => (d ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z")) : "Não informado");
  const period = (a, b) => (a === b ? fmt(a) : `${fmt(a)} a ${fmt(b)}`);

  const state = { visit: null, specialists: [], selectedSpecialistId: null, selectedArea: null };

  function statusClass(status) {
    if (!status) return "";
    // Aceita tanto o formato completo do registrar.html ("Concluído (C)")
    // quanto a letra crua usada nos dados históricos extraídos de Excel ("C").
    const s = String(status).trim().toUpperCase();
    if (s.includes("(C)") || s === "C") return "c";
    if (s.includes("(A)") || s === "A") return "a";
    if (s.includes("(D)") || s === "D") return "d";
    return "";
  }

  function list(arr, emptyMsg) {
    if (!arr || !arr.length) return `<p class="fu-list empty">${escapeHtml(emptyMsg)}</p>`;
    return `<ul class="fu-list">${arr.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
  }

  function initials(nome) {
    return escapeHtml((nome || "?").split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase());
  }

  function renderHeader(v) {
    const totalItens = Object.values(v.resultados_por_area || {}).reduce((acc, r) => acc + (r.itens || []).length, 0);
    return `
      <div class="fu-header">
        <div class="fu-badges">
          <span class="fu-badge">${escapeHtml(v.status || "")}</span>
          <span class="fu-badge">Ano ${escapeHtml(v.ano)}</span>
          ${v.ano === 2099 ? '<span class="fu-badge warn">DADOS DE TESTE</span>' : ""}
          ${v.id.startsWith("LIVE-") ? '<span class="fu-badge warn">AO VIVO — ainda não oficializado no site</span>' : ""}
        </div>
        <h1>${escapeHtml(v.unidade)}</h1>
        <p class="sub">${escapeHtml(v.cidade)} · ${escapeHtml(v.regiao)} · ${period(v.inicio, v.fim)}</p>
        ${v.resumo ? `<p class="fu-resumo">${escapeHtml(v.resumo)}</p>` : ""}
        <div class="fu-overview">
          <div class="fu-ov-stat"><b>${(v.visitantes || []).filter((p) => p.avatar).length}</b><small>especialistas</small></div>
          <div class="fu-ov-stat"><b>${(v.areas || []).length}</b><small>áreas técnicas</small></div>
          <div class="fu-ov-stat"><b>${totalItens}</b><small>itens avaliados</small></div>
          <div class="fu-ov-stat"><b>${(v.acompanhantes || []).length}</b><small>acompanhantes locais</small></div>
        </div>
      </div>`;
  }

  function renderSpecialistsGrid(v) {
    const especialistas = (v.visitantes || []).filter((p) => p.avatar);
    if (!especialistas.length) {
      return `<div class="fu-empty">Nenhum especialista com registro confirmado nesta unidade.</div>`;
    }
    return `
      <div class="fu-section-title">Especialistas — clique para ver o que cada um registrou</div>
      <div class="fu-specialists" id="specGrid">
        ${especialistas
          .map(
            (p) => `
          <button class="fu-spec-card" data-id="${escapeHtml(p.id)}">
            ${p.avatar ? `<img src="${escapeHtml(p.avatar)}" alt="${escapeHtml(p.nome)}">` : `<span class="init">${initials(p.nome)}</span>`}
            <span><b>${escapeHtml(p.nome)}</b><small>${(p.areas || []).length} área(s) registrada(s)</small></span>
          </button>`
          )
          .join("")}
      </div>
      <div class="fu-panel" id="specPanel"></div>`;
  }

  function renderAreaFull(v, area) {
    const r = (v.resultados_por_area || {})[area];
    if (!r) return `<div class="fu-empty">Sem dados registrados para esta área.</div>`;
    return `
      <div class="fu-area-block">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
          <span class="fu-status-badge">${escapeHtml(r.status || "")}</span>
        </div>
        <h3>Resumo</h3>
        <p class="fu-resumo">${escapeHtml(r.resumo || "Sem resumo.")}</p>

        <h3>Indicadores</h3>
        <div class="fu-kpis">
          ${(r.indicadores || []).map((k) => `<div class="fu-kpi"><b>${escapeHtml(k.valor)}</b><small>${escapeHtml(k.rotulo)}</small></div>`).join("")}
        </div>

        <h3>Principais pontos observados</h3>
        ${list(r.principais_pontos, "Nenhum ponto registrado.")}

        <h3>Boas práticas</h3>
        ${list(r.boas_praticas, "Nenhuma boa prática registrada.")}

        <h3>Oportunidades de melhoria</h3>
        ${list(r.oportunidades, "Nenhuma oportunidade registrada.")}

        <h3>Recomendações</h3>
        ${list(r.recomendacoes, "Nenhuma recomendação registrada.")}

        <h3>Observações</h3>
        ${list(r.observacoes, "Nenhuma observação registrada.")}

        <h3>Responsáveis pela ação</h3>
        ${list(r.responsaveis, "Não informado.")}

        <h3>Prazos</h3>
        ${list((r.prazos || []).map(fmt), "Não informado.")}

        <h3>Itens registrados (${(r.itens || []).length})</h3>
        <div class="fu-items">
          ${(r.itens || [])
            .map(
              (it) => `
            <div class="fu-item">
              <div class="fu-item-head">
                <b>${escapeHtml(it.descricao)}</b>
                <span class="fu-item-status ${statusClass(it.status)}">${escapeHtml(it.status || "")}</span>
              </div>
              <div class="fu-item-row"><b>Observado:</b> ${escapeHtml(it.observado || "—")}</div>
              ${it.boa_pratica ? `<div class="fu-item-row"><b>Boa prática:</b> ${escapeHtml(it.boa_pratica)}</div>` : ""}
              ${it.oportunidade ? `<div class="fu-item-row"><b>Oportunidade:</b> ${escapeHtml(it.oportunidade)}</div>` : ""}
              ${it.acompanhado_por ? `<div class="fu-item-row"><b>Acompanhado por:</b> ${escapeHtml(it.acompanhado_por)}</div>` : ""}
            </div>`
            )
            .join("") || '<p class="fu-list empty">Nenhum item detalhado.</p>'}
        </div>

        <div class="fu-fontes">Fonte${(r.fontes || []).length === 1 ? "" : "s"}: ${escapeHtml(r.resumo_fonte || "")}${
      r.fontes && r.fontes.length ? ` · ${r.fontes.length} registro(s)` : ""
    }</div>
      </div>`;
  }

  function selectSpecialist(v, personId) {
    const p = (v.visitantes || []).find((x) => x.id === personId);
    if (!p) return;
    state.selectedSpecialistId = personId;
    document.querySelectorAll(".fu-spec-card").forEach((c) => c.classList.toggle("active", c.dataset.id === personId));

    const areas = (p.areas || []).filter((a) => (v.resultados_por_area || {})[a]);
    state.selectedArea = areas[0] || null;

    const panel = $("#specPanel");
    panel.classList.add("show");
    panel.innerHTML = `
      <div class="fu-panel-head">
        ${p.avatar ? `<img src="${escapeHtml(p.avatar)}" alt="${escapeHtml(p.nome)}">` : `<span class="init">${initials(p.nome)}</span>`}
        <div><h2>${escapeHtml(p.nome)}</h2><p>${escapeHtml(p.origem || "")}</p></div>
      </div>
      ${
        areas.length > 1
          ? `<div class="fu-area-tabs" id="areaTabs">${areas
              .map((a) => `<button class="fu-area-tab${a === state.selectedArea ? " active" : ""}" data-area="${escapeHtml(a)}">${escapeHtml(a)}</button>`)
              .join("")}</div>`
          : areas.length === 1
          ? `<div class="fu-area-tabs"><span class="fu-area-tab active">${escapeHtml(areas[0])}</span></div>`
          : ""
      }
      <div id="areaFull">${areas.length ? renderAreaFull(v, state.selectedArea) : '<div class="fu-empty">Este especialista não tem área com resultados vinculados nesta visita.</div>'}</div>
    `;

    panel.querySelectorAll(".fu-area-tab[data-area]").forEach((btn) => {
      btn.onclick = () => {
        state.selectedArea = btn.dataset.area;
        panel.querySelectorAll(".fu-area-tab").forEach((b) => b.classList.toggle("active", b.dataset.area === state.selectedArea));
        $("#areaFull").innerHTML = renderAreaFull(v, state.selectedArea);
      };
    });

    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function renderAccompanying(v) {
    if (!v.acompanhantes || !v.acompanhantes.length) return "";
    return `
      <div class="fu-section-title">Acompanhantes locais</div>
      <div class="fu-accomp-list">
        ${v.acompanhantes.map((a) => `<span class="fu-accomp-pill">${escapeHtml(a)}</span>`).join("")}
      </div>`;
  }

  async function main() {
    const params = new URLSearchParams(location.search);
    const id = params.get("id");
    const content = $("#content");

    if (!id) {
      content.innerHTML = '<div class="fu-empty">Nenhuma unidade especificada. Volte ao dashboard e clique em uma unidade na linha do tempo.</div>';
      return;
    }

    let visits;
    try {
      const r = await fetch("./data/visits.json", { cache: "no-store" });
      if (!r.ok) throw new Error("visits.json");
      visits = await r.json();
    } catch (e) {
      content.innerHTML = '<div class="fu-empty">Não foi possível carregar os dados das visitas.</div>';
      return;
    }

    let v = visits.find((x) => x.id === id);

    // IDs "LIVE-..." (ou qualquer id não encontrado no estático) podem ser
    // uma visita que já está no banco mas ainda não foi "oficializada" com
    // scripts/gerar_visits_do_banco.js — busca ao vivo antes de desistir.
    if (!v) {
      try {
        const rl = await fetch("./api/visitas-live", { cache: "no-store" });
        if (rl.ok) {
          const data = await rl.json();
          v = (data.visitas || []).find((x) => x.id === id);
        }
      } catch (e) {
        console.warn("Dados ao vivo indisponíveis.", e);
      }
    }

    if (!v) {
      content.innerHTML = `<div class="fu-empty">Visita "${escapeHtml(id)}" não encontrada.</div>`;
      return;
    }

    state.visit = v;
    document.title = `${v.unidade} — Ficha da unidade`;

    content.innerHTML = renderHeader(v) + renderSpecialistsGrid(v) + renderAccompanying(v);

    document.querySelectorAll(".fu-spec-card").forEach((btn) => {
      btn.onclick = () => selectSpecialist(v, btn.dataset.id);
    });

    // Abre o primeiro especialista automaticamente para não precisar de um clique extra
    const first = (v.visitantes || []).find((p) => p.avatar);
    if (first) selectSpecialist(v, first.id);

    const saved = localStorage.getItem("theme");
    if (saved) document.documentElement.dataset.theme = saved;
  }

  $("#printBtn").addEventListener("click", () => window.print());

  main();
})();
