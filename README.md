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

O campo "Ano do ciclo" é uma lista travada: os próximos 5 ciclos (2027 a 2031) aparecem desabilitados até serem habilitados oficialmente (edite as opções em `registrar.html` removendo o `disabled` do ano correspondente quando for a hora). O único ano liberado hoje é **2099**, reservado para testes — assim ninguém registra sem querer em cima do ciclo real enquanto o fluxo ainda está sendo validado.

Cada item na lista "Meus registros recentes" tem um botão **Apagar**, que chama `api/deletar-item.js` — só apaga item do próprio especialista logado (a checagem é feita no servidor, não dá pra apagar registro de outra pessoa nem manipulando a requisição).

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

### Sub-área de TI (`subarea_ti`)

O dropdown "Área técnica" continua com uma única opção "Tecnologia da Informação" (pra não sobrecarregar o formulário). Quando essa opção é escolhida, aparece um campo de texto extra e obrigatório, "Sub-área de TI", onde o especialista digita livremente qual sub-área aquele item cobre — por exemplo `Redes de Computadores`, `Desenvolvimento de Sistemas / Informática` ou `Informática para Internet`. Esse texto vira a área "de verdade" no dashboard e na ficha da unidade (em `lib/visitas.js`, função `areaEfetiva`), então cada sub-área aparece separada, do jeito que já acontece com especialistas que têm mais de uma área técnica. Mesmo critério usado para limpar os dados históricos de 2025/2026 extraídos de Excel.

Banco já provisionado antes desta versão? Rode a migração incremental uma vez:
```
psql "SUA_CONNECTION_STRING" -f db/migration_subarea_ti.sql
```
(ou cole o conteúdo do arquivo no Neon SQL Editor). Instalações novas já recebem a coluna direto pelo `db/schema.sql`.

### Ficha da unidade (`ficha-unidade.html`)

Clicar em uma unidade na "Linha do tempo" da barra lateral do dashboard abre, em nova aba, `ficha-unidade.html?id=<id da visita>` — uma página de apresentação (própria para levar à unidade ou imprimir/exportar em PDF), diferente do painel lateral do dashboard: mostra todos os especialistas com avatar, e ao clicar em cada um exibe as áreas que ele registrou e, para a área escolhida, a informação completa e ordenada (resumo, indicadores, principais pontos, boas práticas, oportunidades, recomendações, observações, responsáveis, prazos e cada item avaliado individualmente com status e acompanhante).

### Unidade de teste

"Unidade Teste (não usar em produção)" está disponível no dropdown do `registrar.html`, com o ano 2099 liberado só para isso — dá pra testar o formulário real (login → banco → dashboard) sem afetar nenhuma unidade de verdade nem esperar rodar `npm run gerar-visits`, porque o dashboard já lê o registro direto do banco via `api/visitas-live.js` (selo "AO VIVO"), assim que a página é recarregada.

**Atenção:** não existe mais uma visita fictícia fixa em `data/visits.json` para essa unidade (havia uma, id `VIS-TESTE-01`, removida na versão 1.8.1). Ela fazia sentido só na fase inicial de validação do layout da ficha da unidade — depois que o registro ao vivo passou a funcionar, essa entrada estática **bloqueava** qualquer registro de teste novo de aparecer: como o merge em `js/app.js` (`loadLiveVisits`) descarta qualquer visita ao vivo cuja chave `unidade|ano` já exista nos dados estáticos, e "SENAI Unidade Teste|2099" já estava ocupado pela fixture, todo registro feito de verdade em `registrar.html` para 2099 ficava escondido — a ficha da unidade sempre abria os dados antigos da fixture em vez do registro novo. Se um dia quiser reintroduzir dados estáticos de exemplo para essa unidade, lembre de não usar a mesma combinação unidade+ano de algo que também vai ser testado ao vivo.

### Dados ao vivo no dashboard (`api/visitas-live.js`)

O dashboard e a ficha da unidade também consultam esse endpoint ao carregar a página — ele lê a tabela `visita_itens` direto do Postgres e devolve no mesmo formato de `data/visits.json`, sem gravar nada em arquivo. Isso significa que qualquer item registrado em `registrar.html` aparece no site (com o selo "AO VIVO") assim que a página é recarregada, sem precisar rodar script nem dar commit. Só some da lista "ao vivo" quando a mesma unidade+ano for oficializada via `gerar-visits` (aí passa a vir do `data/visits.json` normalmente, sem selo).

### Trazer os dados para o dashboard (`scripts/gerar_visits_do_banco.js`)

Script pronto que lê a tabela `visita_itens`, agrupa por unidade + área e gera visitas no mesmo formato de `data/visits.json` — o dashboard não precisa de nenhuma mudança para exibir os dados de 2027+, é o mesmo `index.html`/`js/app.js` de sempre.

```
DATABASE_URL="a mesma connection string do Neon/Vercel" npm run gerar-visits -- 2027
```

Pode ser rodado quantas vezes quiser durante o ano — cada execução substitui as visitas daquele ano específico em `data/visits.json` pela versão mais atual do banco (sem duplicar e sem mexer em anos anteriores), então dá pra usar tanto para acompanhar o progresso ao longo do ciclo quanto para o fechamento final. Depois de rodar, é só commitar e dar `git push` no `data/visits.json` atualizado para o dashboard publicado refletir os dados novos.
