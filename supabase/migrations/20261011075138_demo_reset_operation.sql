-- ClientFlow demo reset operation
-- Resets only business data under the guarded demo organization.
-- Preserves auth.users, profiles, organizations, and organization_members.

create or replace function public.reset_demo_organization(p_org_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid;
  v_demo_user_id uuid;
  v_member_count integer;
  v_client_1 uuid;
  v_client_2 uuid;
  v_client_3 uuid;
  v_client_4 uuid;
  v_client_5 uuid;
  v_project_new uuid;
  v_project_hearing uuid;
  v_project_quoted uuid;
  v_project_won uuid;
  v_project_in_progress uuid;
  v_project_delivered uuid;
  v_project_lost uuid;
  v_inquiry_1 uuid;
  v_inquiry_2 uuid;
  v_status_counts jsonb;
begin
  if p_org_slug is distinct from 'clientflow-demo' then
    raise exception using errcode = '22023', message = 'demo_reset_forbidden';
  end if;

  select o.id into v_org_id
  from public.organizations o
  where o.slug = p_org_slug
    and o.name = 'ClientFlow Demo';

  if v_org_id is null then
    raise exception using errcode = 'P0001', message = 'demo_organization_not_found';
  end if;

  select count(*) into v_member_count
  from public.organization_members m
  where m.organization_id = v_org_id;

  if v_member_count <> 1 then
    raise exception using errcode = 'P0001', message = 'demo_reset_blocked_unexpected_membership';
  end if;

  select m.user_id into v_demo_user_id
  from public.organization_members m
  join public.profiles p on p.id = m.user_id
  where m.organization_id = v_org_id
    and m.role = 'admin'
    and lower(p.email) = 'demo@clientflow.local'
  limit 1;

  if v_demo_user_id is null then
    raise exception using errcode = 'P0001', message = 'demo_reset_blocked_missing_demo_admin';
  end if;

  delete from public.audit_logs where organization_id = v_org_id;
  delete from public.inquiries where organization_id = v_org_id;
  delete from public.activities where organization_id = v_org_id;
  delete from public.projects where organization_id = v_org_id;
  delete from public.clients where organization_id = v_org_id;

  insert into public.clients
    (organization_id, company_name, contact_name, email, phone, created_by, created_at, updated_at)
  values
    (v_org_id, 'Northstar Studio', '佐藤 架', 'contact@northstar.example.com', null, v_demo_user_id,
     now() - interval '12 days', now() - interval '12 days')
  returning id into v_client_1;

  insert into public.clients
    (organization_id, company_name, contact_name, email, phone, created_by, created_at, updated_at)
  values
    (v_org_id, 'Aoba Design', '高橋 綾', 'contact@aoba.example.com', null, v_demo_user_id,
     now() - interval '11 days', now() - interval '11 days')
  returning id into v_client_2;

  insert into public.clients
    (organization_id, company_name, contact_name, email, phone, created_by, created_at, updated_at)
  values
    (v_org_id, 'Harbor Works', '山田 明', 'contact@harbor.example.com', null, v_demo_user_id,
     now() - interval '10 days', now() - interval '10 days')
  returning id into v_client_3;

  insert into public.clients
    (organization_id, company_name, contact_name, email, phone, created_by, created_at, updated_at)
  values
    (v_org_id, 'Linden Foods', '鈴木 澪', 'contact@linden.example.com', null, v_demo_user_id,
     now() - interval '9 days', now() - interval '9 days')
  returning id into v_client_4;

  insert into public.clients
    (organization_id, company_name, contact_name, email, phone, created_by, created_at, updated_at)
  values
    (v_org_id, 'Morrow Labs', '田中 蓮', 'contact@morrow.example.com', null, v_demo_user_id,
     now() - interval '8 days', now() - interval '8 days')
  returning id into v_client_5;

  insert into public.projects
    (organization_id, client_id, title, description, internal_note, amount, status,
     assigned_user_id, due_date, created_by, created_at, updated_at)
  values
    (v_org_id, v_client_1, 'Webサイト改善相談',
     '既存サイトの導線と問い合わせ率を改善するデモ案件です。',
     '初回ヒアリング前。現状ページの課題を整理する。',
     120000, 'new', v_demo_user_id, current_date + 14, v_demo_user_id,
     now() - interval '6 days', now() - interval '6 days')
  returning id into v_project_new;

  insert into public.projects
    (organization_id, client_id, title, description, internal_note, amount, status,
     assigned_user_id, due_date, created_by, created_at, updated_at)
  values
    (v_org_id, v_client_2, '採用LP制作',
     '採用応募の増加を目的としたLP制作のデモ案件です。',
     '採用ターゲットと訴求軸をヒアリング中。',
     450000, 'hearing', v_demo_user_id, current_date + 10, v_demo_user_id,
     now() - interval '5 days', now() - interval '5 days')
  returning id into v_project_hearing;

  insert into public.projects
    (organization_id, client_id, title, description, internal_note, amount, status,
     assigned_user_id, due_date, created_by, created_at, updated_at)
  values
    (v_org_id, v_client_3, '問い合わせ管理改善',
     '問い合わせ受付から案件化までの運用改善を行うデモ案件です。',
     '見積提出済み。回答待ち。',
     280000, 'quoted', v_demo_user_id, current_date + 7, v_demo_user_id,
     now() - interval '4 days', now() - interval '4 days')
  returning id into v_project_quoted;

  insert into public.projects
    (organization_id, client_id, title, description, internal_note, amount, status,
     assigned_user_id, due_date, created_by, created_at, updated_at)
  values
    (v_org_id, v_client_4, 'コーポレートサイト改修',
     '企業サイトの情報設計とUIを改修するデモ案件です。',
     '受注済み。キックオフ日程を調整する。',
     350000, 'won', v_demo_user_id, current_date + 21, v_demo_user_id,
     now() - interval '3 days', now() - interval '3 days')
  returning id into v_project_won;

  insert into public.projects
    (organization_id, client_id, title, description, internal_note, amount, status,
     assigned_user_id, due_date, created_by, created_at, updated_at)
  values
    (v_org_id, v_client_5, '顧客管理システム導入',
     '顧客・案件・活動履歴を一元化するデモ案件です。',
     '画面実装中。次回レビューで操作確認。',
     620000, 'in_progress', v_demo_user_id, current_date + 5, v_demo_user_id,
     now() - interval '2 days', now() - interval '1 day')
  returning id into v_project_in_progress;

  insert into public.projects
    (organization_id, client_id, title, description, internal_note, amount, status,
     assigned_user_id, due_date, created_by, created_at, updated_at)
  values
    (v_org_id, v_client_1, 'キャンペーンLP制作',
     '期間限定キャンペーン用LPを制作した完了済みデモ案件です。',
     '納品済み。',
     180000, 'delivered', v_demo_user_id, current_date - 7, v_demo_user_id,
     now() - interval '7 days', now() - interval '1 day')
  returning id into v_project_delivered;

  insert into public.projects
    (organization_id, client_id, title, description, internal_note, amount, status,
     assigned_user_id, due_date, created_by, created_at, updated_at)
  values
    (v_org_id, v_client_2, 'ECサイト機能追加',
     'ECサイトへの追加機能提案を行った失注済みデモ案件です。',
     '予算都合により今回は見送り。',
     240000, 'lost', v_demo_user_id, null, v_demo_user_id,
     now() - interval '8 days', now() - interval '2 days')
  returning id into v_project_lost;

  insert into public.inquiries
    (organization_id, company_name, contact_name, email, subject, message, client_id, project_id, created_at)
  values
    (v_org_id, 'Northstar Studio', '佐藤 架', 'contact@northstar.example.com',
     'Webサイト改善相談', '問い合わせ導線を改善し、商談につながるサイトへ見直したいです。',
     v_client_1, v_project_new, now() - interval '6 days')
  returning id into v_inquiry_1;

  insert into public.inquiries
    (organization_id, company_name, contact_name, email, subject, message, client_id, project_id, created_at)
  values
    (v_org_id, 'Aoba Design', '高橋 綾', 'contact@aoba.example.com',
     '採用LP制作', '採用候補者向けの情報を整理し、応募につながるLPを制作したいです。',
     v_client_2, v_project_hearing, now() - interval '5 days')
  returning id into v_inquiry_2;

  insert into public.activities
    (organization_id, project_id, type, content, user_id, metadata, created_at)
  values
    (v_org_id, v_project_new, 'inquiry_received', '公開問い合わせフォームから受付', null,
     jsonb_build_object('inquiry_id', v_inquiry_1, 'seed', true), now() - interval '6 days'),
    (v_org_id, v_project_new, 'note', '現行サイトの問い合わせ導線を確認する。', v_demo_user_id,
     jsonb_build_object('seed', true), now() - interval '5 days 20 hours'),
    (v_org_id, v_project_hearing, 'inquiry_received', '公開問い合わせフォームから受付', null,
     jsonb_build_object('inquiry_id', v_inquiry_2, 'seed', true), now() - interval '5 days'),
    (v_org_id, v_project_hearing, 'meeting', '採用ターゲットと掲載コンテンツをヒアリング。', v_demo_user_id,
     jsonb_build_object('seed', true), now() - interval '4 days 18 hours'),
    (v_org_id, v_project_quoted, 'quote_sent', '見積書を提出。', v_demo_user_id,
     jsonb_build_object('seed', true), now() - interval '3 days 20 hours'),
    (v_org_id, v_project_won, 'email', '受注確認とキックオフ候補日を送付。', v_demo_user_id,
     jsonb_build_object('seed', true), now() - interval '2 days 16 hours'),
    (v_org_id, v_project_won, 'status_changed', 'ステータスを 見積提出 から 受注 に変更', v_demo_user_id,
     jsonb_build_object('from', 'quoted', 'to', 'won', 'seed', true), now() - interval '2 days 12 hours'),
    (v_org_id, v_project_in_progress, 'meeting', '進捗レビューを実施し、次回確認項目を整理。', v_demo_user_id,
     jsonb_build_object('seed', true), now() - interval '1 day 6 hours'),
    (v_org_id, v_project_delivered, 'note', '納品と最終確認が完了。', v_demo_user_id,
     jsonb_build_object('seed', true), now() - interval '1 day');

  insert into public.audit_logs
    (organization_id, actor_user_id, project_id, entity_type, entity_id, action, source, old_value, new_value, created_at)
  values
    (v_org_id, null, v_project_new, 'inquiry', v_inquiry_1, 'created', 'public_form',
     null, jsonb_build_object('project_id', v_project_new, 'client_id', v_client_1, 'seed', true),
     now() - interval '6 days'),
    (v_org_id, v_demo_user_id, v_project_won, 'project', v_project_won, 'status_changed', 'user',
     jsonb_build_object('status', 'quoted'), jsonb_build_object('status', 'won', 'seed', true),
     now() - interval '2 days 12 hours');

  select coalesce(jsonb_object_agg(status_text, cnt), '{}'::jsonb)
    into v_status_counts
  from (
    select p.status::text as status_text, count(*)::integer as cnt
    from public.projects p
    where p.organization_id = v_org_id
      and p.deleted_at is null
    group by p.status
    order by p.status::text
  ) s;

  return jsonb_build_object(
    'organization_slug', p_org_slug,
    'clients', (select count(*) from public.clients c where c.organization_id = v_org_id and c.deleted_at is null),
    'projects', (select count(*) from public.projects p where p.organization_id = v_org_id and p.deleted_at is null),
    'activities', (select count(*) from public.activities a where a.organization_id = v_org_id),
    'inquiries', (select count(*) from public.inquiries i where i.organization_id = v_org_id),
    'audit_logs', (select count(*) from public.audit_logs l where l.organization_id = v_org_id),
    'project_statuses', v_status_counts
  );
end;
$$;

revoke all on function public.reset_demo_organization(text) from public, anon, authenticated;
grant execute on function public.reset_demo_organization(text) to service_role;
