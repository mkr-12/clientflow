import Link from "next/link";
import { requireOrganization } from "@/lib/auth";

const statusLabel = {
  new: "新規",
  hearing: "ヒアリング",
  quoted: "見積提出",
  won: "受注",
  in_progress: "進行中",
  delivered: "納品",
  lost: "失注",
} as const;

type ProjectStatus = keyof typeof statusLabel;

function formatCurrency(value: number) {
  return `¥${value.toLocaleString("ja-JP")}`;
}

function formatDate(value: string | null) {
  if (!value) return "期限未設定";

  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00+09:00`));
}

function getClientName(
  clients:
    | { company_name: string | null }
    | { company_name: string | null }[]
    | null,
) {
  const client = Array.isArray(clients) ? clients[0] : clients;
  return client?.company_name ?? "顧客未設定";
}

export default async function DashboardPage() {
  const { supabase, organizationId } = await requireOrganization();
  const today = new Date().toISOString().slice(0, 10);

  const [
    newResult,
    negotiationResult,
    wonResult,
    inProgressResult,
    bookedResult,
    recentResult,
    dueResult,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "new")
      .is("deleted_at", null),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("status", ["hearing", "quoted"])
      .is("deleted_at", null),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "won")
      .is("deleted_at", null),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "in_progress")
      .is("deleted_at", null),
    supabase
      .from("projects")
      .select("amount")
      .eq("organization_id", organizationId)
      .in("status", ["won", "in_progress", "delivered"])
      .is("deleted_at", null),
    supabase
      .from("projects")
      .select("id,title,status,amount,created_at,clients(company_name)")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("projects")
      .select("id,title,status,amount,due_date,clients(company_name)")
      .eq("organization_id", organizationId)
      .in("status", ["new", "hearing", "quoted", "won", "in_progress"])
      .is("deleted_at", null)
      .gte("due_date", today)
      .order("due_date", { ascending: true })
      .limit(5),
  ]);

  const bookedAmount = (bookedResult.data ?? []).reduce(
    (sum, project) => sum + Number(project.amount ?? 0),
    0,
  );

  const hasLoadError = [
    newResult.error,
    negotiationResult.error,
    wonResult.error,
    inProgressResult.error,
    bookedResult.error,
    recentResult.error,
    dueResult.error,
  ].some(Boolean);

  const cards = [
    ["新規", newResult.count ?? 0],
    ["商談", negotiationResult.count ?? 0],
    ["受注", wonResult.count ?? 0],
    ["進行中", inProgressResult.count ?? 0],
    ["受注・進行金額", formatCurrency(bookedAmount)],
  ] as const;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">Overview</p>
          <h1 className="text-2xl font-bold">ダッシュボード</h1>
        </div>
        <Link
          href="/projects/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
        >
          + 新規案件
        </Link>
      </div>

      {hasLoadError && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          ダッシュボードの一部を読み込めませんでした。時間を空けて再度お試しください。
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value]) => (
          <section
            key={label}
            className="rounded-2xl border border-zinc-200 bg-white p-5"
          >
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </section>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <div>
              <p className="text-sm font-semibold">最近の案件</p>
              <p className="mt-1 text-xs text-zinc-500">作成日時が新しい順</p>
            </div>
            <Link
              href="/projects"
              className="text-sm font-semibold text-zinc-700 underline"
            >
              すべて見る
            </Link>
          </div>

          <div className="divide-y divide-zinc-100">
            {(recentResult.data ?? []).map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="grid gap-2 px-5 py-4 hover:bg-zinc-50 sm:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-semibold">{project.title}</p>
                  <p className="text-sm text-zinc-500">
                    {getClientName(project.clients)}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm">
                    {statusLabel[project.status as ProjectStatus] ??
                      project.status}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatCurrency(Number(project.amount ?? 0))}
                  </p>
                </div>
              </Link>
            ))}

            {!recentResult.error && (recentResult.data?.length ?? 0) === 0 && (
              <div className="p-8 text-center">
                <p className="text-sm text-zinc-500">
                  案件はまだありません。
                </p>
                <Link
                  href="/projects/new"
                  className="mt-4 inline-block text-sm font-semibold underline"
                >
                  最初の案件を登録する
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 px-5 py-4">
            <p className="text-sm font-semibold">期限が近い案件</p>
            <p className="mt-1 text-xs text-zinc-500">
              本日以降の未完了案件を期限順に表示
            </p>
          </div>

          <div className="divide-y divide-zinc-100">
            {(dueResult.data ?? []).map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="grid gap-2 px-5 py-4 hover:bg-zinc-50 sm:grid-cols-[1fr_auto]"
              >
                <div>
                  <p className="font-semibold">{project.title}</p>
                  <p className="text-sm text-zinc-500">
                    {getClientName(project.clients)}
                  </p>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm font-semibold">
                    {formatDate(project.due_date)}
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {statusLabel[project.status as ProjectStatus] ??
                      project.status}
                  </p>
                </div>
              </Link>
            ))}

            {!dueResult.error && (dueResult.data?.length ?? 0) === 0 && (
              <div className="p-8 text-center text-sm text-zinc-500">
                期限が設定された進行案件はありません。
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
