// Leitura ao vivo: consulta visita_itens direto no Postgres e devolve as
// visitas já no formato de data/visits.json — sem gravar em arquivo nenhum.
// É o que permite o dashboard mostrar um registro novo assim que a página é
// recarregada, sem esperar alguém rodar scripts/gerar_visits_do_banco.js e
// dar commit. Esse script continua sendo o passo que "oficializa" os dados;
// este endpoint é só para acompanhar o progresso em tempo real.

const { query } = require("../lib/db");
const { gerarVisitasDoAno } = require("../lib/visitas");
const specialists = require("../data/specialists.json");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ erro: "Método não permitido." });
    return;
  }
  try {
    const anoParam = req.query.ano;
    const specialistById = {};
    specialists.forEach((s) => (specialistById[s.id] = s));

    const params = [];
    let where = "";
    if (anoParam) {
      params.push(parseInt(anoParam, 10));
      where = "where vi.ano = $1";
    }

    const { rows } = await query(
      `select vi.*, e.nome as especialista_nome
       from visita_itens vi
       join especialistas e on e.id = vi.especialista_id
       ${where}
       order by vi.ano, vi.unidade, vi.area_tecnica, vi.criado_em`,
      params
    );

    if (!rows.length) {
      res.status(200).json({ visitas: [] });
      return;
    }

    // Agrupa também por ano (a consulta pode trazer vários anos de uma vez)
    const porAno = {};
    rows.forEach((r) => (porAno[r.ano] = porAno[r.ano] || []).push(r));

    let visitas = [];
    Object.entries(porAno).forEach(([ano, rowsDoAno]) => {
      visitas = visitas.concat(gerarVisitasDoAno(parseInt(ano, 10), rowsDoAno, specialistById, { idPrefix: "LIVE-" }));
    });

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ visitas });
  } catch (e) {
    res.status(500).json({ erro: "Erro no servidor.", detalhe: e.message });
  }
};
