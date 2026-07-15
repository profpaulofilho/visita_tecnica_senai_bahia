const { query } = require("../lib/db");
const { getSessionFromReq } = require("../lib/auth");

const STATUS_VALIDOS = ["Concluído (C)", "Em aberto (A)", "Divergente (D)"];

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ erro: "Método não permitido." });
    return;
  }
  const session = getSessionFromReq(req);
  if (!session) {
    res.status(401).json({ erro: "Não autenticado." });
    return;
  }
  try {
    const b = req.body || {};
    const obrigatorios = ["ano", "unidade", "data_visita", "area_tecnica", "descricao_item", "observado", "status"];
    const faltando = obrigatorios.filter((campo) => !b[campo]);
    if (faltando.length) {
      res.status(400).json({ erro: `Campos obrigatórios faltando: ${faltando.join(", ")}` });
      return;
    }
    if (!STATUS_VALIDOS.includes(b.status)) {
      res.status(400).json({ erro: "Status inválido." });
      return;
    }
    // especialista_id vem da sessão autenticada, nunca do corpo da requisição —
    // é isso que impede alguém de registrar um item em nome de outro especialista.
    const { rows } = await query(
      `insert into visita_itens
        (ano, unidade, data_visita, especialista_id, area_tecnica, acompanhante_nome, acompanhante_cargo,
         descricao_item, observado, boa_pratica, oportunidade, responsavel_acao, prazo, status)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       returning id, criado_em`,
      [
        b.ano,
        b.unidade,
        b.data_visita,
        session.id,
        b.area_tecnica,
        b.acompanhante_nome || null,
        b.acompanhante_cargo || null,
        b.descricao_item,
        b.observado,
        b.boa_pratica || null,
        b.oportunidade || null,
        b.responsavel_acao || null,
        b.prazo || null,
        b.status,
      ]
    );
    res.status(201).json({ ok: true, id: rows[0].id, criado_em: rows[0].criado_em });
  } catch (e) {
    res.status(500).json({ erro: "Erro no servidor.", detalhe: e.message });
  }
};
