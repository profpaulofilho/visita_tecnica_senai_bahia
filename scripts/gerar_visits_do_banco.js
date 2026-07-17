// Converte os registros de visita_itens (Postgres, alimentados via registrar.html)
// para o mesmo formato usado em data/visits.json, para um ano específico, e
// grava direto no arquivo (por isso é um script CLI, não uma API).
//
// Uso:
//   DATABASE_URL="postgresql://..." node scripts/gerar_visits_do_banco.js 2027
//
// Pode ser rodado quantas vezes quiser durante o ano (não só no fechamento do
// ciclo) — ele sempre substitui as visitas daquele ano em data/visits.json
// pela versão mais recente do banco, sem mexer nos anos anteriores. É o passo
// que "oficializa" os dados no site (commit + push). Para acompanhar o
// progresso sem esperar isso, o dashboard já mostra os dados ao vivo via
// api/visitas-live.js (ver README).

const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { gerarVisitasDoAno } = require("../lib/visitas");

const ROOT = path.join(__dirname, "..");
const VISITS_PATH = path.join(ROOT, "data", "visits.json");
const SPECIALISTS_PATH = path.join(ROOT, "data", "specialists.json");

async function main() {
  const ano = parseInt(process.argv[2], 10);
  if (!ano) {
    console.error("Uso: node scripts/gerar_visits_do_banco.js <ano>");
    process.exit(1);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Defina DATABASE_URL antes de rodar (mesma variável usada pela Vercel).");
    process.exit(1);
  }

  const specialists = JSON.parse(fs.readFileSync(SPECIALISTS_PATH, "utf-8"));
  const specialistById = {};
  specialists.forEach((s) => (specialistById[s.id] = s));

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const { rows } = await client.query(
    `select vi.*, e.nome as especialista_nome
     from visita_itens vi
     join especialistas e on e.id = vi.especialista_id
     where vi.ano = $1
     order by vi.unidade, vi.area_tecnica, vi.criado_em`,
    [ano]
  );
  await client.end();

  if (!rows.length) {
    console.log(`Nenhum item encontrado para o ano ${ano}. Nada a gerar.`);
    return;
  }

  const novasVisitas = gerarVisitasDoAno(ano, rows, specialistById);

  // Mescla com o visits.json existente, substituindo só as visitas do mesmo ano
  const existentes = JSON.parse(fs.readFileSync(VISITS_PATH, "utf-8"));
  const mantidas = existentes.filter((v) => v.ano !== ano);
  const final = [...mantidas, ...novasVisitas];

  fs.writeFileSync(VISITS_PATH, JSON.stringify(final, null, 2), "utf-8");

  console.log(`Geradas ${novasVisitas.length} visita(s) para o ano ${ano}:`);
  novasVisitas.forEach((v) => console.log(` - ${v.id} ${v.unidade}: ${v.areas.length} área(s), ${v.especialistas.length} especialista(s)`));
  console.log(`\ndata/visits.json atualizado (${final.length} visitas no total).`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error("ERRO:", e.message);
    process.exit(1);
  });
}

module.exports = { main };
