# Visitas Técnicas SENAI Bahia — 2026

Versão corrigida do dashboard estático para GitHub Pages e Vercel.

## Melhorias desta versão
- contraste corrigido no tema escuro;
- painel detalhado das visitas;
- datas programadas e realizadas;
- documentos de origem identificados;
- contorno vetorial da Bahia pela API oficial de Malhas do IBGE;
- base interna de segurança caso os JSON não carreguem;
- busca por cidade, unidade, área e nome de relatório.

## Publicação
Substitua o conteúdo do repositório pelos arquivos deste pacote e faça commit na branch `main`.
A Vercel fará o novo deploy automaticamente.


## Marcadores de especialistas
- Ao mover o mouse sobre uma unidade, o marcador se expande.
- O cartão mostra unidade, cidade, período e os avatares dos especialistas vinculados.
- Visitas sem vínculo nominal exibem um aviso de confirmação pendente, evitando atribuições incorretas.
- Para vincular um especialista, inclua seu ID no campo `especialistas` da visita em `data/visits.json`.


## Fluxo de interação por especialista
1. Clique na cidade ou unidade.
2. O painel lateral apresenta os avatares dos especialistas vinculados.
3. Clique no avatar para abrir o perfil e as áreas de atuação confirmadas.
4. Selecione uma área no dropdown.
5. O painel mostra o resultado consolidado daquela área na visita.

Apenas vínculos confirmados aparecem. Especialistas sem participação documental validada permanecem sinalizados como pendentes.


## Regra de exibição de avatares
- O mapa inicial não mostra fotografias.
- O hover mostra somente unidade, cidade, data e quantidade de áreas.
- As fotografias aparecem apenas depois que a unidade é selecionada.
- O clique em um avatar abre o especialista dentro da ficha da visita.
- Paulo Filho só é associado a áreas de TI, Desenvolvimento de Sistemas, Redes de Computadores e Informática para Internet.
- Registros contendo apenas “Paulo” em outras áreas permanecem sem avatar como identificação pendente.


## Quilometragem
A quilometragem exibida é uma estimativa geodésica entre as unidades confirmadas de cada especialista, em ordem cronológica. Não corresponde à rota rodoviária e não inclui saída, retorno ou deslocamentos locais.


## Release 1.0
- Paulo Filho: período de férias de 12/04/2026 a 16/05/2026 excluído de visitas presenciais, trilha e quilometragem.
- Registros do período aparecem apenas como atividade automatizada/remota quando existirem nos documentos.
- Fotos dos especialistas ficam sempre visíveis na barra lateral.
- No mapa, os avatares aparecem apenas depois que uma unidade é selecionada.


## Release 1.0.1
- Paulo Filho removido da visita de Vitória da Conquista.
- Nenhuma atividade automatizada/remota entra em visita presencial ou quilometragem.
- Não há unidade Itabuna na base atual; qualquer futura entrada não será vinculada automaticamente a Paulo Filho.
- Jequié mantém a observação de visita fora da programação original, mas usa o mesmo marcador azul das demais unidades.


## Release 1.0.3
Correção da lógica de Marcos Paulo:
- todas as visitas já registradas foram preservadas;
- Dendezeiros, Lauro de Freitas e Camaçari foram adicionadas às visitas anteriores;
- nenhuma associação anterior foi removida;
- trilha, contador e quilometragem foram recalculados.


## Release 1.0.4
Auditoria completa das 19 planilhas de origem contra os dados carregados no app:
- 19 áreas técnicas inteiras que existiam nos relatórios estavam ausentes do app (ex.: Edificações em Serrinha, Segurança do Trabalho e IFTP-Biotec em Vitória da Conquista) — adicionadas.
- Santo Antônio de Jesus estava com apenas 3 de 40 itens carregados; reconstruída integralmente.
- Campo "Acompanhado por" agora é preenchido em praticamente todos os itens (antes só o primeiro item de cada bloco de área tinha o acompanhante, por causa de células mescladas nas planilhas de origem).
- Removidos itens sem conteúdo real (restos da aba MODELO e de abas de TI não preenchidas), que apareciam como observações vazias.
- Segurança do Trabalho vinculada a Juliana Neri (coordenadora da equipe) em todas as unidades onde essa área existe; quilometragem e trilha dela recalculadas.
- Nenhum conteúdo pré-existente foi removido nesta auditoria.

## Roadmap — ciclo 2027
A partir de 2026, cada visita tem um campo `ano` e há um filtro de ano na interface. O plano para 2027 é substituir a coleta manual (planilha → extração) por um registro direto na própria plataforma, feito pelos especialistas em campo. Decisão final: página própria (`registrar.html`) com **login individual por especialista** + banco Postgres — não Google Forms, porque login evita que alguém registre em nome de outro especialista (foi exatamente esse tipo de confusão de identidade que precisou ser corrigido na base de 2026). Detalhes e alternativas descartadas em `data/roadmap.json`.

## Registro de visitas 2027+ (`registrar.html`)

Página de login + formulário, uma API serverless (pasta `api/`) e um banco Postgres. Cada um dos 7 especialistas tem seu próprio usuário; o campo "Especialista responsável" não existe mais no formulário — quem preenche é identificado pela sessão logada, então não tem como preencher em nome de outra pessoa.

### Como colocar no ar

1. **Banco de dados**: crie um Postgres gratuito em qualquer provedor (Supabase, Neon, Vercel Postgres...) e copie a connection string.
2. Rode as migrações, nessa ordem:
   ```
   psql "SUA_CONNECTION_STRING" -f db/schema.sql
   psql "SUA_CONNECTION_STRING" -f db/seed_especialistas.sql
   ```
   O seed cria os 7 especialistas com senha temporária (hash bcrypt já pronto no arquivo — a senha em texto puro **não** fica no git, foi entregue separadamente).
3. **Variáveis de ambiente no Vercel** (Project Settings → Environment Variables):
   - `DATABASE_URL` — a connection string do passo 1.
   - `JWT_SECRET` — qualquer string longa e aleatória (ex.: `openssl rand -hex 32`).
4. Deploy normal (`git push`, o Vercel já detecta os arquivos em `api/` como funções serverless automaticamente).
5. Acesse `/registrar.html`, entre com o email/senha temporária de cada especialista — a plataforma pede para trocar a senha no primeiro login.

### Dados coletados
Tabela `visita_itens` (uma linha por item avaliado, mesmo formato das 14 perguntas do roteiro original).

### Trazer os dados para o dashboard (`scripts/gerar_visits_do_banco.js`)

Script pronto que lê a tabela `visita_itens`, agrupa por unidade + área e gera visitas no mesmo formato de `data/visits.json` — o dashboard não precisa de nenhuma mudança para exibir os dados de 2027+, é o mesmo `index.html`/`js/app.js` de sempre.

```
DATABASE_URL="a mesma connection string do Neon/Vercel" npm run gerar-visits -- 2027
```

Pode ser rodado quantas vezes quiser durante o ano — cada execução substitui as visitas daquele ano específico em `data/visits.json` pela versão mais atual do banco (sem duplicar e sem mexer em anos anteriores), então dá pra usar tanto para acompanhar o progresso ao longo do ciclo quanto para o fechamento final. Depois de rodar, é só commitar e dar `git push` no `data/visits.json` atualizado para o dashboard publicado refletir os dados novos.
