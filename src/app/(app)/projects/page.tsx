import Link from "next/link";
import { requireOrganization } from "@/lib/auth";

const statusOptions = [
  ["", "すべて"],
  ["new", "新規"],
  ["hearing", "ヒアリング"],
  ["quoted", "見積提出"],
  ["won", "受注"],
  ["in_progress", "進行中"],
  ["delivered", "納品"],
  ["lost", "失注"],
] as const;

type ProjectStatus = Exclude<(typeof statusOptions)[number][0], "">;

const statusLabel: Record<ProjectStatus, string> = Object.fromEntries(
  statusOptions.filter(([value]) => value !== ""),
) as Record<ProjectStatus, string>;

const validStatuses = new Set<ProjectStatus>(
  statusOptions
    .map(([value]) => value)
    .filter((value): value is ProjectStatus => value !== ""),
);

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    error?: string;
    q?: string;
    filter?: string;
  }>;
}) {
  const params = await searchParams;
  const searchQuery = params.q?.trim() ?? "";
  const selectedStatus =
    params.filter && validStatuses.has(params.filter as ProjectStatus)
      ? (params.filter as ProjectStatus)
      : "";

  const { supabase, organizationId } = await requireOrganization();

  let projectsQuery = supabase
    .from("projects")
    .select(
      "id,title,status,amount,due_date,clients(company_name,contact_name,email)",
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (selectedStatus) {
    projectsQuery = projectsQuery.eq("status", selectedStatus);
  }

  const { data: projects, error: loadError } = await projectsQuery;

  const normalizedSearch = searchQuery.toLocaleLowerCase("ja-JP");
  const filteredProjects = (projects ?? []).filter((project) => {
    if (!normalizedSearch) return true;

    const client = Array.isArray(project.clients)
      ? project.clients[0]
      : project.clients;

    return [
      project.title,
      client?.company_name,
      client?.contact_name,
      client?.email,
    ].some((value) =>
      String(value ?? "")
        .toLocaleLowerCase("ja-JP")
        .includes(normalizedSearch),
    );
  });

  const hasActiveFilter = Boolean(searchQuery || selectedStatus);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">Sales pipeline</p>
          <h1 className="text-2xl font-bold">案件一覧</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href="/projects/kanban"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold"
          >
            Kanban
          </Link>
          <Link
            href="/projects/new"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            案件を登録
          </Link>
        </div>
      </div>

      {params.status === "deleted" && (
        <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
          案件を削除しました。
        </p>
      )}
      {params.error && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          操作を完了できませんでした。
        </p>
      )}
      {loadError && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          案件の読み込みに失敗しました。時間を空けて再度お試しください。
        </p>
      )}

      <form
        action="/projects"
        method="get"
        className="mb-5 grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 md:grid-cols-[1fr_220px_auto]"
      >
        <label className="block text-sm font-medium">
          検索
          <input
            name="q"
            type="search"
            defaultValue={searchQuery}
            placeholder="案件名・会社名・担当者名・メール"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
          />
        </label>

        <label className="block text-sm font-medium">
          ステータス
          <select
            name="filter"
            defaultValue={selectedStatus}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
          >
            {statusOptions.map(([value, label]) => (
              <option key={value || "all"} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end gap-2">
          <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
            検索
          </button>
          {hasActiveFilter && (
            <Link
              href="/projects"
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold"
            >
              クリア
            </Link>
          )}
        </div>
      </form>

      <div className="mb-3 flex items-center justify-between text-sm text-zinc-500">
        <p>{hasActiveFilter ? "検索結果" : "案件"} {filteredProjects.length}件</p>
        {selectedStatus && <p>ステータス: {statusLabel[selectedStatus]}</p>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="divide-y divide-zinc-100">
          {filteredProjects.map((project) => {
            const client = Array.isArray(project.clients)
              ? project.clients[0]
              : project.clients;

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="grid gap-2 p-4 hover:bg-zinc-50 sm:grid-cols-[1fr_160px_140px]"
              >
                <div>
                  <p className="font-semibold">{project.title}</p>
                  <p className="text-sm text-zinc-500">
                    {client?.company_name ?? "顧客未設定"}
                  </p>
                </div>
                <p className="text-sm">
                  {statusLabel[project.status as ProjectStatus] ?? project.status}
                </p>
                <p className="text-sm font-medium">
                  ¥{Number(project.amount ?? 0).toLocaleString("ja-JP")}
                </p>
              </Link>
            );
          })}

          {!loadError && filteredProjects.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-zinc-500">
                {hasActiveFilter
                  ? "条件に一致する案件はありません。"
                  : "案件はまだありません。"}
              </p>
              {!hasActiveFilter && (
                <Link
                  href="/projects/new"
                  className="mt-4 inline-block text-sm font-semibold underline"
                >
                  最初の案件を登録する
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-zinc-400">
        MVPでは最大200件を対象に、案件名・顧客情報をサーバー側で検索します。
      </p>
    </div>
  );
}
