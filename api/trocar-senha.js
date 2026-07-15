const { query } = require("../lib/db");
const { getSessionFromReq, comparePassword, hashPassword } = require("../lib/auth");

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
    const { senha_atual, nova_senha } = req.body || {};
    if (!senha_atual || !nova_senha || nova_senha.length < 8) {
      res.status(400).json({ erro: "Nova senha precisa ter pelo menos 8 caracteres." });
      return;
    }
    const { rows } = await query("select senha_hash from especialistas where id = $1", [session.id]);
    const esp = rows[0];
    if (!esp) {
      res.status(404).json({ erro: "Especialista não encontrado." });
      return;
    }
    const ok = await comparePassword(senha_atual, esp.senha_hash);
    if (!ok) {
      res.status(401).json({ erro: "Senha atual incorreta." });
      return;
    }
    const novoHash = await hashPassword(nova_senha);
    await query(
      "update especialistas set senha_hash = $1, precisa_trocar_senha = false where id = $2",
      [novoHash, session.id]
    );
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: "Erro no servidor.", detalhe: e.message });
  }
};
