-- ClientFlow initial schema
-- Supabase/PostgreSQL: organization-scoped RLS + public inquiry transaction

create type public.member_role as enum ('admin', 'member');
create type public.project_status as enum ('new', 'hearing', 'quoted', 'won', 'in_progress', 'delivered', 'lost');
create type public.activity_type as enum ('inquiry_received', 'call', 'meeting', 'email', 'quote_sent', 'status_changed', 'note', 'other');
create type public.audit_source as enum ('user', 'public_form', 'system');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);
create index organization_members_org_role_idx on public.organization_members (organization_id, role);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_name text not null check (char_length(company_name) between 1 and 120),
  contact_name text not null check (char_length(contact_name) between 1 and 100),
  email text not null,
  phone text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id)
);
create index clients_org_company_idx on public.clients (organization_id, company_name) where deleted_at is null;
create index clients_org_email_idx on public.clients (organization_id, email) where deleted_at is null;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null,
  title text not null check (char_length(title) between 1 and 160),
  description text,
  internal_note text,
  amount integer not null default 0 check (amount >= 0),
  status public.project_status not null default 'new',
  assigned_user_id uuid,
  due_date date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, id),
  constraint projects_client_same_org_fk
    foreign key (organization_id, client_id)
    references public.clients (organization_id, id),
  constraint projects_assignee_same_org_fk
    foreign key (organization_id, assigned_user_id)
    references public.organization_members (organization_id, user_id)
);
create index projects_org_status_idx on public.projects (organization_id, status) where deleted_at is null;
create index projects_org_assignee_idx on public.projects (organization_id, assigned_user_id) where deleted_at is null;
create index projects_org_due_date_idx on public.projects (organization_id, due_date) where deleted_at is null;
create index projects_client_idx on public.projects (client_id) where deleted_at is null;

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null,
  type public.activity_type not null,
  content text not null check (char_length(content) between 1 and 5000),
  user_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint activities_project_same_org_fk
    foreign key (organization_id, project_id)
    references public.projects (organization_id, id) on delete cascade,
  constraint activities_user_same_org_fk
    foreign key (organization_id, user_id)
    references public.organization_members (organization_id, user_id)
);
create index activities_project_created_idx on public.activities (project_id, created_at desc);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  company_name text not null,
  contact_name text not null,
  email text not null,
  subject text not null,
  message text not null,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now()
);
create index inquiries_org_created_idx on public.inquiries (organization_id, created_at desc);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  source public.audit_source not null default 'user',
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);
create index audit_logs_project_created_idx on public.audit_logs (project_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger clients_set_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(coalesce(new.email, ''), '@', 1), 'User'),
    coalesce(new.email, '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_organization_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = target_organization_id
      and m.user_id = auth.uid()
      and m.role = 'admin'
  );
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.is_org_admin(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.is_org_admin(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.activities enable row level security;
alter table public.inquiries enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select_self on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy organizations_select_member on public.organizations for select to authenticated using (public.is_org_member(id));
create policy organizations_update_admin on public.organizations for update to authenticated using (public.is_org_admin(id)) with check (public.is_org_admin(id));

create policy org_members_select on public.organization_members for select to authenticated using (user_id = auth.uid() or public.is_org_member(organization_id));
create policy org_members_insert_admin on public.organization_members for insert to authenticated with check (public.is_org_admin(organization_id));
create policy org_members_update_admin on public.organization_members for update to authenticated using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));
create policy org_members_delete_admin on public.organization_members for delete to authenticated using (public.is_org_admin(organization_id));

create policy clients_select_member on public.clients for select to authenticated using (public.is_org_member(organization_id));
create policy clients_insert_member on public.clients for insert to authenticated with check (public.is_org_member(organization_id) and created_by = auth.uid());
create policy clients_update_member on public.clients for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy projects_select_member on public.projects for select to authenticated using (public.is_org_member(organization_id));
create policy projects_insert_member on public.projects for insert to authenticated with check (public.is_org_member(organization_id) and created_by = auth.uid());
create policy projects_update_member on public.projects for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy activities_select_member on public.activities for select to authenticated using (public.is_org_member(organization_id));
create policy activities_insert_member on public.activities for insert to authenticated with check (public.is_org_member(organization_id) and user_id = auth.uid());

create policy inquiries_select_member on public.inquiries for select to authenticated using (public.is_org_member(organization_id));
create policy audit_logs_select_member on public.audit_logs for select to authenticated using (public.is_org_member(organization_id));

revoke all on public.profiles, public.organizations, public.organization_members, public.clients, public.projects, public.activities, public.inquiries, public.audit_logs from anon;
grant select, update on public.profiles to authenticated;
grant select, update on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select, insert, update on public.clients to authenticated;
grant select, insert, update on public.projects to authenticated;
grant select, insert on public.activities to authenticated;
grant select on public.inquiries, public.audit_logs to authenticated;

create or replace function public.log_project_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    insert into public.activities (organization_id, project_id, type, content, user_id, metadata)
    values (
      new.organization_id,
      new.id,
      'status_changed',
      'ステータスを ' || old.status::text || ' から ' || new.status::text || ' に変更',
      auth.uid(),
      jsonb_build_object('from', old.status, 'to', new.status)
    );

    insert into public.audit_logs (
      organization_id, actor_user_id, project_id, entity_type, entity_id, action, source, old_value, new_value
    ) values (
      new.organization_id, auth.uid(), new.id, 'project', new.id, 'status_changed', 'user',
      jsonb_build_object('status', old.status), jsonb_build_object('status', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger projects_log_status_change
after update of status on public.projects
for each row execute function public.log_project_status_change();

create or replace function public.submit_public_inquiry(
  p_org_slug text,
  p_company_name text,
  p_contact_name text,
  p_email text,
  p_subject text,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_inquiry_id uuid;
  v_client_id uuid;
  v_project_id uuid;
begin
  if char_length(trim(p_company_name)) not between 1 and 120
     or char_length(trim(p_contact_name)) not between 1 and 100
     or char_length(trim(p_subject)) not between 1 and 160
     or char_length(trim(p_message)) not between 10 and 5000
     or char_length(trim(p_email)) not between 3 and 254 then
    raise exception 'invalid_input';
  end if;

  select id into v_org_id from public.organizations where slug = p_org_slug;
  if v_org_id is null then raise exception 'organization_not_found'; end if;

  insert into public.inquiries (organization_id, company_name, contact_name, email, subject, message)
  values (v_org_id, trim(p_company_name), trim(p_contact_name), lower(trim(p_email)), trim(p_subject), trim(p_message))
  returning id into v_inquiry_id;

  insert into public.clients (organization_id, company_name, contact_name, email, created_by)
  values (v_org_id, trim(p_company_name), trim(p_contact_name), lower(trim(p_email)), null)
  returning id into v_client_id;

  insert into public.projects (organization_id, client_id, title, description, status, created_by)
  values (v_org_id, v_client_id, trim(p_subject), trim(p_message), 'new', null)
  returning id into v_project_id;

  update public.inquiries
    set client_id = v_client_id, project_id = v_project_id
    where id = v_inquiry_id;

  insert into public.activities (organization_id, project_id, type, content, user_id, metadata)
  values (v_org_id, v_project_id, 'inquiry_received', '公開問い合わせフォームから受付', null, jsonb_build_object('inquiry_id', v_inquiry_id));

  insert into public.audit_logs (organization_id, project_id, entity_type, entity_id, action, source, new_value)
  values (v_org_id, v_project_id, 'inquiry', v_inquiry_id, 'created', 'public_form', jsonb_build_object('project_id', v_project_id, 'client_id', v_client_id));

  return jsonb_build_object('inquiry_id', v_inquiry_id, 'project_id', v_project_id);
end;
$$;

revoke all on function public.submit_public_inquiry(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_public_inquiry(text, text, text, text, text, text) to service_role;
