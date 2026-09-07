import Link from "next/link";
import { requireOrganization } from "@/lib/auth";

const statusLabel: Record<string, string> = {
  new: "新規",
  hearing: "ヒアリング",
  quoted: "見積提出",
  won: "受注",
  in_progress: "進行中",
  delivered: "納品",
  lost: "失注",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { supabase, organizationId } = await requireOrganization();
  const { data: projects } = await supabase
    .from("projects")
    .select("id,title,status,amount,due_date,clients(company_name)")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">Sales pipeline</p>
          <h1 className="text-2xl font-bold">案件一覧</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/projects/kanban" className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold">Kanban</Link>
          <Link href="/projects/new" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">案件を登録</Link>
        </div>
      </div>

      {params.status === "deleted" && (
        <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">案件を削除しました。</p>
      )}
      {params.error && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">操作を完了できませんでした。</p>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="divide-y divide-zinc-100">
          {(projects ?? []).map((project) => {
            const client = Array.isArray(project.clients) ? project.clients[0] : project.clients;
            return (
              <Link key={project.id} href={`/projects/${project.id}`} className="grid gap-2 p-4 hover:bg-zinc-50 sm:grid-cols-[1fr_160px_140px]">
                <div>
                  <p className="font-semibold">{project.title}</p>
                  <p className="text-sm text-zinc-500">{client?.company_name ?? "顧客未設定"}</p>
                </div>
                <p className="text-sm">{statusLabel[project.status] ?? project.status}</p>
                <p className="text-sm font-medium">¥{Number(project.amount ?? 0).toLocaleString("ja-JP")}</p>
              </Link>
            );
          })}
          {!projects?.length && (
            <div className="p-8 text-center">
              <p className="text-sm text-zinc-500">案件はまだありません。</p>
              <Link href="/projects/new" className="mt-4 inline-block text-sm font-semibold underline">最初の案件を登録する</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
