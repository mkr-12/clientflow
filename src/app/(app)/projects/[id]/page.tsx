import Link from "next/link";
import { notFound } from "next/navigation";
import { createActivity, deleteProject, updateProject } from "../actions";
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

function formatActivityContent(type: string, content: string) {
  if (type === "status_changed") {
    const match = content.match(
      /^ステータスを ([a-z_]+) から ([a-z_]+) に変更$/,
    );

    if (match) {
      const [, from, to] = match;
      return `${statusLabel[from] ?? from} → ${statusLabel[to] ?? to}`;
    }
  }

  return content;
}

function activityTypeLabel(type: string) {
  const labels: Record<string, string> = {
    inquiry_received: "問い合わせ受付",
    call: "電話",
    meeting: "打ち合わせ",
    email: "メール",
    quote_sent: "見積送付",
    status_changed: "ステータス変更",
    note: "メモ",
    other: "その他",
  };

  return labels[type] ?? "活動";
}

function formatActivityDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

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
          {query.status === "created"
            ? "案件を登録しました。"
            : query.status === "activity-added"
              ? "活動履歴を追加しました。"
              : "案件情報を更新しました。"}
        </p>
      )}
      {query.error && (
        <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {query.error === "invalid-client"
            ? "選択した顧客を確認してください。"
            : query.error === "invalid-activity"
              ? "活動の種類と内容を確認してください。"
              : query.error === "activity-save-failed"
                ? "活動履歴を保存できませんでした。"
                : "操作を完了できませんでした。"}
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

          <div className="mt-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-semibold">活動履歴</h2>
              <p className="mt-1 text-xs text-zinc-500">
                電話・打ち合わせ・メール・メモなどを案件ごとに残せます。
              </p>
            </div>
            <span className="text-xs text-zinc-400">
              {(activities ?? []).length}件
            </span>
          </div>

          <form
            action={createActivity}
            className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4"
          >
            <input type="hidden" name="projectId" value={project.id} />

            <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
              <label className="block text-sm font-medium">
                種類
                <select
                  name="type"
                  defaultValue="note"
                  required
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                >
                  <option value="call">電話</option>
                  <option value="meeting">打ち合わせ</option>
                  <option value="email">メール</option>
                  <option value="quote_sent">見積送付</option>
                  <option value="note">メモ</option>
                  <option value="other">その他</option>
                </select>
              </label>

              <label className="block text-sm font-medium">
                内容
                <textarea
                  name="content"
                  required
                  maxLength={5000}
                  rows={3}
                  placeholder="例：先方と要件を確認。次回までに見積を作成する。"
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-zinc-500">
                ステータス変更はKanban・案件編集時に自動記録されます。
              </p>
              <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
                活動を追加
              </button>
            </div>
          </form>

          <div className="mt-4 space-y-2">
            {(activities ?? []).map((activity) => (
              <div
                key={activity.id}
                className="relative rounded-xl border border-zinc-200 bg-zinc-50/70 px-4 py-3 pl-11"
              >
                <span className="absolute left-4 top-5 h-2.5 w-2.5 rounded-full bg-zinc-400" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-zinc-600 ring-1 ring-zinc-200">
                    {activityTypeLabel(activity.type)}
                  </span>
                  <time className="text-xs text-zinc-400">
                    {formatActivityDate(activity.created_at)}
                  </time>
                </div>
                <p className="mt-2 text-sm font-medium text-zinc-800">
                  {formatActivityContent(activity.type, activity.content)}
                </p>
              </div>
            ))}

            {!activities?.length && (
              <p className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">
                活動履歴はまだありません。
              </p>
            )}
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
