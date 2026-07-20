-- Migração incremental: Apresentação Gerencial (mapa + resumo por área + considerações gerais)
-- Rode uma vez em bancos já provisionados:
--   psql "SUA_CONNECTION_STRING" -f db/migration_resumo_gerencial.sql
-- Instalações novas: essas mesmas tabelas já estão em db/schema.sql, não precisa rodar aqui também.

-- Resumo condensado por unidade + área, editável pelos especialistas logados.
-- Sobrepõe (por unidade_chave + area) o conteúdo transcrito do PDF em
-- data/resumo-gerencial.json — igual ao padrão já usado para visita_itens
-- (baseline em JSON + camada "ao vivo" no banco).
create table if not exists resumo_gerencial_areas (
  unidade_chave text not null,      -- mesma chave de UNIT_META em lib/visitas.js (ex.: "Lauro de Freitas")
  area text not null,               -- nome da área exatamente como aparece no card (ex.: "Eletrotécnica")
  resumo text not null,
  atualizado_por text references especialistas(id),
  atualizado_em timestamptz not null default now(),
  primary key (unidade_chave, area)
);

-- Bloco "Considerações Gerais e Futuras Ações" (não vinculado a uma unidade).
-- ordem funciona como chave/posição; ativo=false esconde o item sem apagar o
-- histórico (soft delete), mesmo raciocínio do campo `ativo` em especialistas.
create table if not exists consideracoes_gerais_itens (
  ordem int primary key,
  texto text not null,
  ativo boolean not null default true,
  atualizado_por text references especialistas(id),
  atualizado_em timestamptz not null default now()
);

create or replace function set_atualizado_em_resumo()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_resumo_gerencial_areas_atualizado on resumo_gerencial_areas;
create trigger trg_resumo_gerencial_areas_atualizado
before update on resumo_gerencial_areas
for each row execute function set_atualizado_em_resumo();

drop trigger if exists trg_consideracoes_gerais_atualizado on consideracoes_gerais_itens;
create trigger trg_consideracoes_gerais_atualizado
before update on consideracoes_gerais_itens
for each row execute function set_atualizado_em_resumo();
