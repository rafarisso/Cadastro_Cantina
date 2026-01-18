create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','viewer')),
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

drop policy if exists "User can read own role" on public.user_roles;
create policy "User can read own role"
  on public.user_roles
  for select
  to authenticated
  using (user_id = auth.uid());

-- Admin-only policies

drop policy if exists "Admin can select guardians" on public.guardians;
create policy "Admin can select guardians"
  on public.guardians
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'admin'
    )
  );

drop policy if exists "Admin can select students" on public.students;
create policy "Admin can select students"
  on public.students
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'admin'
    )
  );

drop policy if exists "Admin can select authorizations" on public.authorizations;
create policy "Admin can select authorizations"
  on public.authorizations
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'admin'
    )
  );

drop policy if exists "Admin can update authorizations" on public.authorizations;
create policy "Admin can update authorizations"
  on public.authorizations
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'admin'
    )
  );

drop policy if exists "Admin can select documents" on public.documents;
create policy "Admin can select documents"
  on public.documents
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'admin'
    )
  );

drop policy if exists "Admin can select audit logs" on public.audit_logs;
create policy "Admin can select audit logs"
  on public.audit_logs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.role = 'admin'
    )
  );

-- Promote a user to admin (replace USER_ID):
-- insert into public.user_roles(user_id, role) values ('<COLE_AQUI_SEU_USER_ID_DO_AUTH.USERS>', 'admin');