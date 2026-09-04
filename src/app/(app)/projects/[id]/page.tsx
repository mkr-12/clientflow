import { notFound } from "next/navigation";
import { requireOrganization } from "@/lib/auth";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, organizationId } = await requireOrganization();

  const { data: project } = await supabase
    .from("projects")
    .select("id,title,description,internal_note,amount,status,due_date,clients(company_name,contact_name,email),activities(id,type,content,created_at)")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!project) notFound();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <p className="text-sm text-zinc-500">案件詳細</p>
        <h1 className="mt-1 text-2xl font-bold">{project.title}</h1>
        <p className="mt-4 whitespace-pre-wrap text-sm text-zinc-700">{project.description || "説明はありません。"}</p>
        <h2 className="mt-8 font-semibold">活動履歴</h2>
        <div className="mt-3 space-y-3">
          {(project.activities ?? []).map((activity) => (
            <div key={activity.id} className="rounded-xl bg-zinc-50 p-3 text-sm"><p>{activity.content}</p><p className="mt-1 text-xs text-zinc-500">{new Date(activity.created_at).toLocaleString("ja-JP")}</p></div>
          ))}
        </div>
      </section>
      <aside className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm">
        <dl className="space-y-4"><div><dt className="text-zinc-500">ステータス</dt><dd className="font-semibold">{project.status}</dd></div><div><dt className="text-zinc-500">金額</dt><dd className="font-semibold">¥{Number(project.amount ?? 0).toLocaleString("ja-JP")}</dd></div><div><dt className="text-zinc-500">納期</dt><dd>{project.due_date ?? "未設定"}</dd></div></dl>
      </aside>
    </div>
  );
}
