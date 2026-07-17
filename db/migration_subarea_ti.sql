-- Migração incremental: adiciona a coluna subarea_ti à tabela visita_itens já existente.
-- Rode isso no Neon SQL Editor (Vercel Storage > seu banco > Open in Neon > SQL Editor),
-- do mesmo jeito que schema.sql e seed_especialistas.sql foram rodados originalmente.
-- Seguro rodar mais de uma vez (if not exists).

alter table visita_itens
  add column if not exists subarea_ti text;

comment on column visita_itens.subarea_ti is
  'Preenchido só quando area_tecnica = ''Tecnologia da Informação''. Texto livre digitado pelo especialista (ex.: "Redes de Computadores", "Desenvolvimento de Sistemas / Informática", "Informática para Internet"). Usado para gerar a área específica no dashboard, em vez do rótulo genérico "Tecnologia da Informação".';
