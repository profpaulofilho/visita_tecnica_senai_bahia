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
    const { id } = req.body || {};
    if (!id) {
      res.status(400).json({ erro: "Informe o id do item." });
      return;
    }
    // Só apaga se o item pertencer ao especialista logado — ninguém consegue
    // apagar registro de outra pessoa, nem passando o id na mão.
    const { rowCount } = await query(
      "delete from visita_itens where id = $1 and especialista_id = $2",
      [id, session.id]
    );
    if (!rowCount) {
      res.status(404).json({ erro: "Item não encontrado (ou não pertence a você)." });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: "Erro no servidor.", detalhe: e.message });
  }
};
