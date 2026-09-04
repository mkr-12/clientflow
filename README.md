# ClientFlow

問い合わせ受付から商談・受注・納品までを一元管理する、小規模事業者向けCRMのポートフォリオプロジェクトです。

## Stack

- Next.js 16 / React 19 / TypeScript
- Tailwind CSS 4
- Supabase Auth / PostgreSQL / RLS
- dnd-kit
- Vercel Hobby for development and validation

## Current state

Implementation foundation prepared from approved Requirements v1.0, Screen Design v1.0 and DB Detailed Design v1.0.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Create a Supabase project, apply the migration under `supabase/migrations`, then follow `docs/bootstrap-demo.md`.

## Security boundary

The public inquiry form never writes directly to business tables. It goes through a Next.js Server Action and a service-role-only PostgreSQL function. Organization boundaries are enforced by PostgreSQL RLS and relational constraints.

See `docs/security.md` for details.
