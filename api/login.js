const { query } = require("../lib/db");
const { comparePassword, signSession, setSessionCookie } = require("../lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ erro: "Método não permitido." });
    return;
  }
  try {
    const { email, senha } = req.body || {};
    if (!email || !senha) {
      res.status(400).json({ erro: "Informe email e senha." });
      return;
    }
    const { rows } = await query(
      "select id, nome, email, senha_hash, precisa_trocar_senha, ativo from especialistas where lower(email) = lower($1)",
      [email]
    );
    const esp = rows[0];
    if (!esp || !esp.ativo) {
      res.status(401).json({ erro: "Credenciais inválidas." });
      return;
    }
    const ok = await comparePassword(senha, esp.senha_hash);
    if (!ok) {
      res.status(401).json({ erro: "Credenciais inválidas." });
      return;
    }
    const token = signSession({ id: esp.id, nome: esp.nome, email: esp.email });
    setSessionCookie(res, token);
    res.status(200).json({
      id: esp.id,
      nome: esp.nome,
      email: esp.email,
      precisa_trocar_senha: esp.precisa_trocar_senha,
    });
  } catch (e) {
    res.status(500).json({ erro: "Erro no servidor.", detalhe: e.message });
  }
};
