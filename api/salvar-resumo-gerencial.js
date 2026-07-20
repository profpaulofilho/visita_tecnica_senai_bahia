// Grava edições feitas na Apresentação Gerencial. Exige login (qualquer um
// dos especialistas cadastrados pode editar — sem distinção de autoria além
// do registro de quem/quando, igual ao resto da plataforma). Dois tipos de
// registro no mesmo endpoint, distinguidos pelo campo "tipo" do corpo:
//   { tipo: "area", unidadeChave, area, resumo }
//   { tipo: "consideracao", ordem?, texto, ativo? }
// Quando "ordem" não vem no corpo (tipo consideracao), é tratado como item
// novo: calcula a próxima ordem livre e insere.

const { query } = require("../lib/db");
const { getSessionFromReq } = require("../lib/auth");

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

    if (b.tipo === "area") {
      const unidadeChave = (b.unidadeChave || "").trim();
      const area = (b.area || "").trim();
      const resumo = (b.resumo || "").trim();
      if (!unidadeChave || !area || resumo.length < 3) {
        res.status(400).json({ erro: "Informe unidadeChave, area e um resumo com pelo menos 3 caracteres." });
        return;
      }
      const { rows } = await query(
        `insert into resumo_gerencial_areas (unidade_chave, area, resumo, atualizado_por)
         values ($1,$2,$3,$4)
         on conflict (unidade_chave, area)
         do update set resumo = excluded.resumo, atualizado_por = excluded.atualizado_por, atualizado_em = now()
         returning unidade_chave, area, resumo, atualizado_em`,
        [unidadeChave, area, resumo, session.id]
      );
      res.status(200).json({ ok: true, item: rows[0] });
      return;
    }

    if (b.tipo === "consideracao") {
      const texto = (b.texto || "").trim();
      const ativo = b.ativo === false ? false : true;
      if (!texto) {
        res.status(400).json({ erro: "Informe o texto da consideração." });
        return;
      }
      let ordem = b.ordem;
      if (!ordem) {
        const { rows: maxRows } = await query(
          "select coalesce(max(ordem), 0) + 1 as proxima from consideracoes_gerais_itens"
        );
        ordem = maxRows[0].proxima;
      }
      const { rows } = await query(
        `insert into consideracoes_gerais_itens (ordem, texto, ativo, atualizado_por)
         values ($1,$2,$3,$4)
         on conflict (ordem)
         do update set texto = excluded.texto, ativo = excluded.ativo, atualizado_por = excluded.atualizado_por, atualizado_em = now()
         returning ordem, texto, ativo, atualizado_em`,
        [ordem, texto, ativo, session.id]
      );
      res.status(200).json({ ok: true, item: rows[0] });
      return;
    }

    res.status(400).json({ erro: 'Campo "tipo" inválido — use "area" ou "consideracao".' });
  } catch (e) {
    res.status(500).json({ erro: "Erro no servidor.", detalhe: e.message });
  }
};
