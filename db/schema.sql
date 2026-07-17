-- Schema para o registro de visitas técnicas SENAI Bahia — ciclo 2027+
-- Compatível com qualquer Postgres (Supabase, Neon, Vercel Postgres, Railway...)

create extension if not exists "pgcrypto";

-- Especialistas com login próprio (substitui o dropdown "Especialista responsável"
-- do roteiro original: agora o especialista é o usuário autenticado, não um campo
-- selecionável — elimina o risco de alguém preencher em nome de outro).
create table if not exists especialistas (
  id text primary key,              -- ex: 'ESP001', mesmo id usado em data/specialists.json
  nome text not null,
  email text unique not null,
  senha_hash text not null,
  precisa_trocar_senha boolean not null default true,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Um registro por item avaliado (mesma granularidade do roteiro em 14 perguntas).
-- Data flui direto neste formato; perto do fechamento do ciclo, uma consulta agrupa
-- por unidade+area para gerar o mesmo formato usado em data/visits.json.
create table if not exists visita_itens (
  id uuid primary key default gen_random_uuid(),
  ano int not null,
  unidade text not null,
  data_visita date not null,
  especialista_id text not null references especialistas(id),
  area_tecnica text not null,
  subarea_ti text, -- preenchido só quando area_tecnica = 'Tecnologia da Informação': texto livre digitado pelo especialista (ex.: "Redes de Computadores", "Desenvolvimento de Sistemas / Informática", "Informática para Internet")
  acompanhante_nome text,
  acompanhante_cargo text,
  descricao_item text not null,
  observado text not null,
  boa_pratica text,
  oportunidade text,
  responsavel_acao text,
  prazo date,
  status text not null check (status in ('Concluído (C)','Em aberto (A)','Divergente (D)')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_visita_itens_ano on visita_itens(ano);
create index if not exists idx_visita_itens_unidade on visita_itens(unidade);
create index if not exists idx_visita_itens_especialista on visita_itens(especialista_id);

-- Trigger simples para manter atualizado_em em dia
create or replace function set_atualizado_em()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_visita_itens_atualizado on visita_itens;
create trigger trg_visita_itens_atualizado
  before update on visita_itens
  for each row execute function set_atualizado_em();
