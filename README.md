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
