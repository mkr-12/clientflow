create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_organization_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function private.is_org_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_organization_id
      and m.user_id = auth.uid()
      and m.role = 'admin'
  );
$$;

revoke all on function private.is_org_member(uuid) from public, anon;
revoke all on function private.is_org_admin(uuid) from public, anon;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.is_org_admin(uuid) to authenticated;

alter policy organizations_select_member on public.organizations using ((select private.is_org_member(id)));
alter policy organizations_update_admin on public.organizations using ((select private.is_org_admin(id))) with check ((select private.is_org_admin(id)));

alter policy org_members_select on public.organization_members using (user_id = (select auth.uid()) or (select private.is_org_member(organization_id)));
alter policy org_members_insert_admin on public.organization_members with check ((select private.is_org_admin(organization_id)));
alter policy org_members_update_admin on public.organization_members using ((select private.is_org_admin(organization_id))) with check ((select private.is_org_admin(organization_id)));
alter policy org_members_delete_admin on public.organization_members using ((select private.is_org_admin(organization_id)));

alter policy clients_select_member on public.clients using ((select private.is_org_member(organization_id)));
alter policy clients_insert_member on public.clients with check ((select private.is_org_member(organization_id)) and created_by = (select auth.uid()));
alter policy clients_update_member on public.clients using ((select private.is_org_member(organization_id))) with check ((select private.is_org_member(organization_id)));

alter policy projects_select_member on public.projects using ((select private.is_org_member(organization_id)));
alter policy projects_insert_member on public.projects with check ((select private.is_org_member(organization_id)) and created_by = (select auth.uid()));
alter policy projects_update_member on public.projects using ((select private.is_org_member(organization_id))) with check ((select private.is_org_member(organization_id)));

alter policy activities_select_member on public.activities using ((select private.is_org_member(organization_id)));
alter policy activities_insert_member on public.activities with check ((select private.is_org_member(organization_id)) and user_id = (select auth.uid()));
alter policy inquiries_select_member on public.inquiries using ((select private.is_org_member(organization_id)));
alter policy audit_logs_select_member on public.audit_logs using ((select private.is_org_member(organization_id)));

revoke all on function public.is_org_member(uuid) from public, anon, authenticated;
revoke all on function public.is_org_admin(uuid) from public, anon, authenticated;
drop function public.is_org_member(uuid);
drop function public.is_org_admin(uuid);

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.log_project_status_change() from public, anon, authenticated;
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

alter function public.set_updated_at() set search_path = public, pg_temp;
revoke all on function public.set_updated_at() from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public;
