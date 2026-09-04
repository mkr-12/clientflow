# Demo bootstrap

After creating a user in Supabase Auth, copy its UUID and run this in the SQL Editor with the placeholder replaced:

```sql
insert into public.organizations (name, slug)
values ('ClientFlow Demo', 'clientflow-demo')
returning id;
```

Then use the returned organization UUID and the Auth user UUID:

```sql
insert into public.organization_members (organization_id, user_id, role)
values ('ORGANIZATION_UUID', 'AUTH_USER_UUID', 'admin');
```

Set `.env.local` from `.env.example`. Do not commit `.env.local`.
