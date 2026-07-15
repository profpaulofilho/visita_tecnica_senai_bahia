const { getSessionFromReq } = require("../lib/auth");

module.exports = async (req, res) => {
  const session = getSessionFromReq(req);
  if (!session) {
    res.status(401).json({ erro: "Não autenticado." });
    return;
  }
  res.status(200).json({ id: session.id, nome: session.nome, email: session.email });
};
