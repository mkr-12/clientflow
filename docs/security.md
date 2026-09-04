# Security Design

- `NEXT_PUBLIC_*` contains only Supabase URL and publishable key.
- `SUPABASE_SECRET_KEY` is server-only and must never be imported by Client Components.
- Public inquiry does not receive direct table INSERT privileges.
- The public form calls a Server Action, which validates input and calls a service-role-only PostgreSQL RPC.
- The RPC creates inquiry/client/project/activity/audit rows in one transaction.
- Business tables are scoped by `organization_id` and protected by RLS.
- Project-to-client and project-to-assignee constraints enforce the same organization at the database layer.
- `audit_logs` has no client-side INSERT/UPDATE/DELETE policy; it is append-only from privileged DB logic.
- Client/project removal is designed as soft-delete (`deleted_at`) rather than hard delete.
- Proxy refreshes auth cookies, but authorization is not delegated to Proxy: Server Components/Actions and RLS remain authoritative.
- The included in-memory contact rate limiter is development-only. Replace it with a durable distributed limiter before public production use.
