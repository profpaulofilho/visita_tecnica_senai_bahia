// Leitura ao vivo das edições feitas na Apresentação Gerencial. Pública (sem
// login) — a edição é que exige sessão, a leitura não, igual ao dashboard
// principal. Devolve só o que foi editado no banco; o front-end mescla isso
// por cima do baseline de data/resumo-gerencial.json (mesmo padrão de
// api/visitas-live.js + data/visits.json).

const { query } = require("../lib/db");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ erro: "Método não permitido." });
    return;
  }
  try {
    const [areasResult, consideracoesResult] = await Promise.all([
      query(
        `select unidade_chave, area, resumo, atualizado_em
         from resumo_gerencial_areas
         order by unidade_chave, area`
      ),
      query(
        `select ordem, texto, ativo, atualizado_em
         from consideracoes_gerais_itens
         order by ordem`
      ),
    ]);

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      areas: areasResult.rows,
      consideracoes: consideracoesResult.rows,
    });
  } catch (e) {
    res.status(500).json({ erro: "Erro no servidor.", detalhe: e.message });
  }
};
