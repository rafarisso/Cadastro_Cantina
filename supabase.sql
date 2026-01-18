create extension if not exists pgcrypto;

create table if not exists public.guardians (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  cpf text not null unique,
  birth_date date not null,
  email text not null,
  phone_primary text not null,
  phone_secondary text not null,
  cep text not null,
  address_street text not null,
  address_number text not null,
  address_complement text,
  address_neighborhood text not null,
  address_city text not null,
  address_state text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guardians_cpf_idx on public.guardians (cpf);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.guardians(id) on delete cascade,
  full_name text not null,
  class_room text not null,
  period text not null check (period in ('manha','tarde')),
  school_name text not null default 'Colégio Órion',
  created_at timestamptz not null default now()
);

create unique index if not exists students_unique_guardian_name_class_period
  on public.students (guardian_id, full_name, class_room, period);

create table if not exists public.authorizations (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid not null references public.guardians(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  term_version text not null,
  term_text text not null,
  signature_data_url text not null,
  term_hash_sha256 text not null,
  accepted_at timestamptz not null,
  accepted_ip text not null,
  accepted_user_agent text not null,
  status text not null default 'active' check (status in ('active','revoked')),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists authorizations_one_active_per_student
  on public.authorizations (student_id)
  where status = 'active';

create index if not exists authorizations_guardian_idx on public.authorizations (guardian_id);
create index if not exists authorizations_student_idx on public.authorizations (student_id);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  authorization_id uuid not null references public.authorizations(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists documents_auth_idx on public.documents (authorization_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  entity_id uuid,
  meta_json jsonb,
  created_at timestamptz not null default now()
);

alter table public.guardians enable row level security;
alter table public.students enable row level security;
alter table public.authorizations enable row level security;
alter table public.documents enable row level security;
alter table public.audit_logs enable row level security;

-- Sem policies: acesso via Netlify Functions usando SUPABASE_SERVICE_ROLE_KEY.
