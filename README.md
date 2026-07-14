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
