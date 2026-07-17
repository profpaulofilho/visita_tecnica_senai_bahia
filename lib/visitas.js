// Lógica compartilhada entre scripts/gerar_visits_do_banco.js (grava em
// data/visits.json, roda localmente) e api/visitas-live.js (só lê, roda na
// Vercel). Fica em lib/ para não duplicar entre os dois.

// Metadados fixos das 19 unidades + Unidade Teste (cidade, região, lat/lng) —
// os mesmos já usados em data/visits.json. Não muda de ano para ano.
const UNIT_META = {
  "Dendezeiros": { unidade: "SENAI Dendezeiros", cidade: "Salvador", regiao: "RMS", lat: -12.9718, lng: -38.5011 },
  "Lauro de Freitas": { unidade: "SENAI Lauro de Freitas", cidade: "Lauro de Freitas", regiao: "RMS", lat: -12.8944, lng: -38.3272 },
  "Candeias": { unidade: "SENAI Candeias", cidade: "Candeias", regiao: "RMS", lat: -12.6716, lng: -38.5472 },
  "Camaçari": { unidade: "SENAI Camaçari", cidade: "Camaçari", regiao: "RMS", lat: -12.6975, lng: -38.324 },
  "Teixeira de Freitas": { unidade: "SENAI Teixeira de Freitas", cidade: "Teixeira de Freitas", regiao: "Extremo Sul", lat: -17.5399, lng: -39.742 },
  "Eunápolis": { unidade: "SENAI Eunápolis", cidade: "Eunápolis", regiao: "Extremo Sul", lat: -16.3775, lng: -39.58 },
  "Ilhéus": { unidade: "SENAI Ilhéus", cidade: "Ilhéus", regiao: "Sul", lat: -14.7936, lng: -39.0466 },
  "Vitória da Conquista": { unidade: "SENAI Vitória da Conquista", cidade: "Vitória da Conquista", regiao: "Sudoeste", lat: -14.8619, lng: -40.8448 },
  "Serrinha": { unidade: "SENAI Serrinha", cidade: "Serrinha", regiao: "Nordeste", lat: -11.6642, lng: -39.0075 },
  "Barreiras": { unidade: "SENAI Barreiras", cidade: "Barreiras", regiao: "Oeste", lat: -12.1528, lng: -44.99 },
  "Luís Eduardo Magalhães": { unidade: "SENAI Luís Eduardo Magalhães", cidade: "Luís Eduardo Magalhães", regiao: "Oeste", lat: -12.0956, lng: -45.7866 },
  "Alagoinhas": { unidade: "SENAI Alagoinhas", cidade: "Alagoinhas", regiao: "Litoral Norte", lat: -12.1356, lng: -38.4192 },
  "Feira de Santana": { unidade: "SENAI Feira de Santana", cidade: "Feira de Santana", regiao: "Centro-Norte", lat: -12.2664, lng: -38.9663 },
  "Santo Antônio de Jesus": { unidade: "SENAI Santo Antônio de Jesus", cidade: "Santo Antônio de Jesus", regiao: "Recôncavo", lat: -12.9698, lng: -39.2619 },
  "Ourolândia": { unidade: "SENAI Ourolândia", cidade: "Ourolândia", regiao: "Centro-Norte", lat: -10.9581, lng: -41.0756 },
  "Jacobina": { unidade: "SENAI Jacobina", cidade: "Jacobina", regiao: "Centro-Norte", lat: -11.1812, lng: -40.5117 },
  "Senhor do Bonfim": { unidade: "SENAI Senhor do Bonfim", cidade: "Senhor do Bonfim", regiao: "Centro-Norte", lat: -10.4594, lng: -40.1896 },
  "Juazeiro": { unidade: "SENAI Juazeiro", cidade: "Juazeiro", regiao: "Norte", lat: -9.4111, lng: -40.4986 },
  "Jequié": { unidade: "SENAI Jequié", cidade: "Jequié", regiao: "Sudoeste", lat: -13.8578, lng: -40.0839 },
  "Cimatec": { unidade: "SENAI Cimatec", cidade: "Salvador", regiao: "RMS", lat: -12.938416, lng: -38.387138 },
  "Unidade Teste (não usar em produção)": { unidade: "SENAI Unidade Teste", cidade: "Salvador", regiao: "Teste", lat: -12.9714, lng: -38.5014 },
};

function dedup(list) {
  const seen = [];
  for (const raw of list) {
    const v = (raw || "").toString().trim();
    if (v && !seen.includes(v)) seen.push(v);
  }
  return seen;
}

function fmtDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  return dt.toISOString().slice(0, 10);
}

function acompanhadoPor(nome, cargo) {
  if (nome && cargo) return `${nome} — ${cargo}`;
  return nome || cargo || null;
}

function buildAreaBucket(itensDoBanco) {
  const itens = itensDoBanco.map((r) => {
    const it = {
      descricao: r.descricao_item,
      observado: r.observado,
      boa_pratica: r.boa_pratica || undefined,
      oportunidade: r.oportunidade || undefined,
      status: r.status,
      acompanhado_por: acompanhadoPor(r.acompanhante_nome, r.acompanhante_cargo) || undefined,
    };
    Object.keys(it).forEach((k) => it[k] === undefined && delete it[k]);
    return it;
  });

  const boas = dedup(itens.map((i) => i.boa_pratica));
  const oport = dedup(itens.map((i) => i.oportunidade));
  const pontos = dedup(itens.map((i) => i.observado));
  const resp = dedup(itensDoBanco.map((r) => r.responsavel_acao));
  const prazos = dedup(itensDoBanco.map((r) => fmtDate(r.prazo)));
  const statusItens = itens.map((i) => i.status).filter(Boolean);

  return {
    status: "Registrado via plataforma (registrar.html)",
    resumo: pontos[0] || "Itens registrados pelos especialistas em campo.",
    resumo_fonte: "Formulário de visitas 2027+ (login individual por especialista)",
    indicadores: [
      { rotulo: "Itens avaliados", valor: itens.length },
      { rotulo: "Oportunidades", valor: oport.length },
      { rotulo: "Boas práticas", valor: boas.length },
    ],
    principais_pontos: pontos,
    boas_praticas: boas,
    oportunidades: oport,
    recomendacoes: [],
    observacoes: [],
    responsaveis: resp,
    prazos: prazos,
    status_itens: statusItens,
    itens,
    fontes: itensDoBanco.map((r) => ({
      arquivo: "Banco de dados (tabela visita_itens)",
      registro_id: r.id,
      especialista: r.especialista_nome,
      data: fmtDate(r.data_visita),
    })),
  };
}

// Lógica pura: recebe as linhas já buscadas do banco + o mapa de especialistas
// e devolve a lista de visitas no formato de data/visits.json. Não toca em
// arquivo nem em rede — isso é o que permite testar sem precisar de um banco,
// e é o que permite reusar tanto no script CLI quanto na API ao vivo.
// Quando area_tecnica é "Tecnologia da Informação" e o especialista digitou uma
// sub-área (campo subarea_ti, texto livre no formulário), usamos o texto digitado
// como a área "de verdade" para fins de agrupamento/exibição — assim o dashboard
// mostra Redes de Computadores / Desenvolvimento de Sistemas / Informática para
// Internet separadas, em vez de um único bucket genérico "Tecnologia da Informação".
// Mesmo critério usado ao limpar os dados históricos de 2025/2026 extraídos de Excel.
function areaEfetiva(r) {
  if (r.area_tecnica === "Tecnologia da Informação" && (r.subarea_ti || "").trim()) {
    return r.subarea_ti.trim();
  }
  return r.area_tecnica;
}

function gerarVisitasDoAno(ano, rows, specialistById, opts) {
  opts = opts || {};
  const idPrefix = opts.idPrefix || "VIS";
  if (!rows.length) return [];

  const porUnidade = {};
  rows.forEach((r) => {
    (porUnidade[r.unidade] = porUnidade[r.unidade] || []).push(r);
  });

  const novasVisitas = [];
  let idx = 1;
  for (const [unidadeBare, itensUnidade] of Object.entries(porUnidade)) {
    const meta = UNIT_META[unidadeBare];
    if (!meta) {
      console.warn(`AVISO: unidade "${unidadeBare}" não está no UNIT_META — pulando (adicione lat/lng manualmente se for unidade nova).`);
      continue;
    }

    const porArea = {};
    itensUnidade.forEach((r) => {
      const area = areaEfetiva(r);
      (porArea[area] = porArea[area] || []).push(r);
    });

    const resultados_por_area = {};
    Object.entries(porArea).forEach(([area, itens]) => {
      resultados_por_area[area] = buildAreaBucket(itens);
    });

    const especialistaIds = dedup(itensUnidade.map((r) => r.especialista_id));
    const visitantes = especialistaIds.map((id) => {
      const areasDoEspecialista = dedup(
        itensUnidade.filter((r) => r.especialista_id === id).map((r) => areaEfetiva(r))
      );
      const sp = specialistById[id];
      return {
        id,
        nome: sp ? sp.nome : id,
        avatar: sp ? sp.avatar : null,
        areas: areasDoEspecialista,
        origem: "Registrado via plataforma (login individual por especialista)",
      };
    });

    const datas = dedup(itensUnidade.map((r) => fmtDate(r.data_visita))).sort();
    const acompanhantes = dedup(
      itensUnidade.map((r) => acompanhadoPor(r.acompanhante_nome, r.acompanhante_cargo))
    );

    novasVisitas.push({
      id: `${idPrefix}${ano}-${String(idx).padStart(2, "0")}`,
      unidade: meta.unidade,
      unidade_chave: unidadeBare,
      cidade: meta.cidade,
      regiao: meta.regiao,
      inicio: datas[0] || null,
      fim: datas[datas.length - 1] || null,
      lat: meta.lat,
      lng: meta.lng,
      areas: Object.keys(resultados_por_area),
      especialistas: especialistaIds,
      visitantes,
      resultados_por_area,
      status: "Em andamento",
      resumo: `${especialistaIds.length} especialista(s) registraram ${itensUnidade.length} item(ns) em ${Object.keys(resultados_por_area).length} área(s) técnica(s).`,
      observacao: "Dados gerados automaticamente a partir da tabela visita_itens (formulário registrar.html).",
      acompanhantes,
      relatorios: [],
      fontes_dados: ["Banco de dados (tabela visita_itens)"],
      ano,
    });
    idx += 1;
  }

  return novasVisitas;
}

module.exports = { gerarVisitasDoAno, buildAreaBucket, dedup, fmtDate, acompanhadoPor, areaEfetiva, UNIT_META };
