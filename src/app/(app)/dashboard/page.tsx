import { requireOrganization } from "@/lib/auth";

export default async function DashboardPage() {
  const { supabase, organizationId } = await requireOrganization();

  const [{ count: newCount }, { count: activeCount }, { data: wonProjects }] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "new").is("deleted_at", null),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).in("status", ["hearing", "quoted", "won", "in_progress"]).is("deleted_at", null),
    supabase.from("projects").select("amount").eq("organization_id", organizationId).in("status", ["won", "in_progress", "delivered"]).is("deleted_at", null),
  ]);

  const pipelineValue = (wonProjects ?? []).reduce((sum, project) => sum + Number(project.amount ?? 0), 0);

  const cards = [
    ["新規問い合わせ", newCount ?? 0],
    ["進行中案件", activeCount ?? 0],
    ["受注・進行金額", `¥${pipelineValue.toLocaleString("ja-JP")}`],
  ];

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-zinc-500">Overview</p>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map(([label, value]) => (
          <section key={label} className="rounded-2xl border border-zinc-200 bg-white p-5">
            <p className="text-sm text-zinc-500">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
