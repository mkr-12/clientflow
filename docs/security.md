# Security Design

- `NEXT_PUBLIC_*` contains only the Supabase URL and publishable key.
- `SUPABASE_SECRET_KEY`, `RATE_LIMIT_PEPPER`, and `DEMO_USER_PASSWORD_B64` are server-only and must never be imported by Client Components.
- Public inquiry does not receive direct table INSERT privileges.
- The public form calls a Server Action, validates input, applies durable rate limiting, and then calls service-role-only PostgreSQL RPCs.
- The inquiry RPC creates inquiry/client/project/activity/audit rows in one transaction.
- The durable rate limiter stores only an HMAC-SHA256 key hash in PostgreSQL and exposes its consume RPC only to `service_role`.
- Business tables are scoped by `organization_id` and protected by RLS.
- Project-to-client and project-to-assignee constraints enforce the same organization at the database layer.
- `audit_logs` has no client-side INSERT/UPDATE/DELETE policy; it is append-only from privileged DB logic.
- Client/project removal is designed as soft-delete (`deleted_at`) rather than hard delete.
- Proxy refreshes auth cookies, but authorization is not delegated to Proxy: Server Components/Actions and RLS remain authoritative.
- Demo business data must use clearly fictional names and reserved domains such as `example.com`; real customer or personal data must not be used.
