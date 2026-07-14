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
