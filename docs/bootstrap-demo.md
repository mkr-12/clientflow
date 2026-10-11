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

## Demo reset

The public demo must be reset only from a trusted local/admin environment. Do not expose the reset RPC through a public route or client bundle.

The reset preserves:

- `auth.users`
- `profiles`
- `organizations`
- `organization_members`

It replaces only business data for the guarded `clientflow-demo` organization:

- `clients`
- `projects`
- `activities`
- `inquiries`
- `audit_logs`

The rate-limit bucket table is intentionally not reset because it is not organization-scoped.

Run the reset with an explicit one-shot confirmation value:

```bash
DEMO_RESET_CONFIRM=clientflow-demo npm run demo:reset
```

Safety gates are fail-closed. The reset RPC refuses to run unless the organization slug/name and the single demo admin membership match the expected demo environment.
