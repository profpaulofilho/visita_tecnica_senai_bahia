const { query } = require("../lib/db");
const { getSessionFromReq } = require("../lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ erro: "Método não permitido." });
    return;
  }
  const session = getSessionFromReq(req);
  if (!session) {
    res.status(401).json({ erro: "Não autenticado." });
    return;
  }
  try {
    const { rows } = await query(
      `select id, ano, unidade, data_visita, area_tecnica, descricao_item, status, criado_em
       from visita_itens
       where especialista_id = $1
       order by criado_em desc
       limit 100`,
      [session.id]
    );
    res.status(200).json({ itens: rows });
  } catch (e) {
    res.status(500).json({ erro: "Erro no servidor.", detalhe: e.message });
  }
};
