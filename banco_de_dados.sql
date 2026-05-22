-- ============================================================
-- TERRACONTROL — Script SQL para o Supabase
-- Cole este código inteiro no SQL Editor do Supabase
-- ============================================================

-- Tabela de Obras
create table obras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  proprietario text,
  local text,
  orcamento numeric default 0,
  status text default 'Em andamento',
  inicio date,
  fim date,
  obs text,
  created_at timestamptz default now()
);

-- Tabela de Fornecedores
create table fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text default 'Materiais',
  telefone text,
  obs text,
  created_at timestamptz default now()
);

-- Tabela de Gastos
create table gastos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references obras(id) on delete set null,
  categoria text not null,
  fornecedor text,
  valor numeric not null,
  data date not null,
  forma_pagamento text,
  descricao text,
  nf text,
  created_at timestamptz default now()
);

-- Segurança: liberar acesso para usuários autenticados
alter table obras enable row level security;
alter table fornecedores enable row level security;
alter table gastos enable row level security;

create policy "acesso autenticado obras"
  on obras for all using (auth.role() = 'authenticated');

create policy "acesso autenticado fornecedores"
  on fornecedores for all using (auth.role() = 'authenticated');

create policy "acesso autenticado gastos"
  on gastos for all using (auth.role() = 'authenticated');
