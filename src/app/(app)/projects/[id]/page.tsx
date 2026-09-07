import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProject, updateProject } from "../actions";
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

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, organizationId } = await requireOrganization();

  const [{ data: project }, { data: clients }, { data: activities }] = await Promise.all([
    supabase
      .from("projects")
      .select("id,title,description,internal_note,amount,status,due_date,client_id,clients(company_name,contact_name,email)")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("clients")
      .select("id,company_name,contact_name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("company_name"),
    supabase
      .from("activities")
      .select("id,type,content,created_at")
      .eq("organization_id", organizationId)
      .eq("project_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!project) notFound();
  const projectClient = Array.isArray(project.clients) ? project.clients[0] : project.clients;

  return (
    <div>
      <Link href="/projects" className="text-sm text-zinc-500 hover:text-zinc-900">← 案件一覧へ</Link>

      {query.status && (
        <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
          {query.status === "created" ? "案件を登録しました。" : "案件情報を更新しました。"}
        </p>
      )}
      {query.error && (
        <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {query.error === "invalid-client" ? "選択した顧客を確認してください。" : "操作を完了できませんでした。"}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <p className="text-sm text-zinc-500">案件詳細</p>
          <h1 className="mt-1 text-2xl font-bold">{project.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">{projectClient?.company_name ?? "顧客未設定"} / {projectClient?.contact_name ?? ""}</p>
          <p className="mt-4 whitespace-pre-wrap text-sm text-zinc-700">{project.description || "説明はありません。"}</p>

          {project.internal_note && (
            <div className="mt-6 rounded-xl bg-amber-50 p-4">
              <p className="text-xs font-semibold text-amber-800">社内メモ</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-amber-950">{project.internal_note}</p>
            </div>
          )}

          <h2 className="mt-8 font-semibold">活動履歴</h2>
          <div className="mt-3 space-y-3">
            {(activities ?? []).map((activity) => (
              <div key={activity.id} className="rounded-xl bg-zinc-50 p-3 text-sm">
                <p>{activity.content}</p>
                <p className="mt-1 text-xs text-zinc-500">{new Date(activity.created_at).toLocaleString("ja-JP")}</p>
              </div>
            ))}
            {!activities?.length && <p className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">活動履歴はまだありません。</p>}
          </div>
        </section>

        <aside className="space-y-4">
          <form action={updateProject} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="font-semibold">案件情報を編集</h2>
            <input type="hidden" name="id" value={project.id} />

            <label className="block text-sm font-medium">顧客
              <select name="clientId" required defaultValue={project.client_id} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2">
                {(clients ?? []).map((client) => (
                  <option key={client.id} value={client.id}>{client.company_name} / {client.contact_name}</option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium">案件名
              <input name="title" required maxLength={160} defaultValue={project.title} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
            </label>

            <label className="block text-sm font-medium">説明
              <textarea name="description" maxLength={5000} rows={4} defaultValue={project.description ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
            </label>

            <label className="block text-sm font-medium">社内メモ
              <textarea name="internalNote" maxLength={5000} rows={4} defaultValue={project.internal_note ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">金額
                <input name="amount" type="number" min={0} step={1} required defaultValue={project.amount} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium">納期
                <input name="dueDate" type="date" defaultValue={project.due_date ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
              </label>
            </div>

            <label className="block text-sm font-medium">ステータス
              <select name="status" defaultValue={project.status} className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2">
                <option value="new">新規</option>
                <option value="hearing">ヒアリング</option>
                <option value="quoted">見積提出</option>
                <option value="won">受注</option>
                <option value="in_progress">進行中</option>
                <option value="delivered">納品</option>
                <option value="lost">失注</option>
              </select>
            </label>

            <div className="rounded-xl bg-zinc-50 p-3 text-xs text-zinc-500">
              現在: {statusLabel[project.status] ?? project.status} / ¥{Number(project.amount ?? 0).toLocaleString("ja-JP")}
            </div>

            <button className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 font-semibold text-white">更新</button>
          </form>

          <form action={deleteProject} className="rounded-2xl border border-red-200 bg-white p-6">
            <input type="hidden" name="id" value={project.id} />
            <h2 className="font-semibold text-red-700">案件を削除</h2>
            <p className="mt-2 text-xs text-zinc-500">データは論理削除され、一覧・Kanban・集計から除外されます。</p>
            <button className="mt-4 w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700">削除</button>
          </form>
        </aside>
      </div>
    </div>
  );
}
