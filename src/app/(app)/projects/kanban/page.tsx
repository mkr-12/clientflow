import { requireOrganization } from "@/lib/auth";

const columns = [
  ["new", "新規"], ["hearing", "ヒアリング"], ["quoted", "見積提出"], ["won", "受注"], ["in_progress", "進行中"], ["delivered", "納品"], ["lost", "失注"],
] as const;

export default async function KanbanPage() {
  const { supabase, organizationId } = await requireOrganization();
  const { data: projects } = await supabase
    .from("projects")
    .select("id,title,status,amount,clients(company_name)")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  return (
    <div>
      <p className="text-sm text-zinc-500">Pipeline</p>
      <h1 className="mb-6 text-2xl font-bold">Kanban</h1>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map(([status, label]) => {
          const items = (projects ?? []).filter((project) => project.status === status);
          return (
            <section key={status} className="w-72 shrink-0 rounded-2xl bg-zinc-100 p-3">
              <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">{label}</h2><span className="text-xs text-zinc-500">{items.length}</span></div>
              <div className="space-y-3">
                {items.map((project) => {
                  const client = Array.isArray(project.clients) ? project.clients[0] : project.clients;
                  return <article key={project.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"><p className="font-semibold">{project.title}</p><p className="mt-1 text-xs text-zinc-500">{client?.company_name}</p><p className="mt-3 text-sm">¥{Number(project.amount ?? 0).toLocaleString("ja-JP")}</p></article>;
                })}
              </div>
            </section>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-zinc-500">ドラッグ&ドロップ更新は次の実装ステップでdnd-kitに接続します。</p>
    </div>
  );
}
