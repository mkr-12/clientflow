import Link from "next/link";
import { createProject } from "../actions";
import { requireOrganization } from "@/lib/auth";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { supabase, organizationId } = await requireOrganization();
  const { data: clients } = await supabase
    .from("clients")
    .select("id,company_name,contact_name")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("company_name");

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/projects" className="text-sm text-zinc-500 hover:text-zinc-900">← 案件一覧へ</Link>
      <p className="mt-6 text-sm text-zinc-500">Project</p>
      <h1 className="text-2xl font-bold">案件を登録</h1>

      {error && (
        <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error === "invalid" ? "入力内容を確認してください。" : error === "invalid-client" ? "選択した顧客を確認してください。" : "保存に失敗しました。時間を空けて再度お試しください。"}
        </p>
      )}

      {!clients?.length ? (
        <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
          <p className="text-sm text-zinc-500">案件登録には顧客が1件以上必要です。</p>
          <Link href="/clients/new" className="mt-4 inline-block text-sm font-semibold underline">顧客を登録する</Link>
        </div>
      ) : (
        <form action={createProject} className="mt-6 space-y-5 rounded-2xl border border-zinc-200 bg-white p-6">
          <label className="block text-sm font-medium">顧客
            <select name="clientId" required className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2">
              {clients.map((client) => (
                <option key={client.id} value={client.id}>{client.company_name} / {client.contact_name}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">案件名
            <input name="title" required maxLength={160} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">説明
            <textarea name="description" maxLength={5000} rows={5} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">社内メモ
            <textarea name="internalNote" maxLength={5000} rows={4} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">金額
              <input name="amount" type="number" min={0} step={1} defaultValue={0} required className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium">納期
              <input name="dueDate" type="date" className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
            </label>
          </div>
          <label className="block text-sm font-medium">ステータス
            <select name="status" defaultValue="new" className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2">
              <option value="new">新規</option>
              <option value="hearing">ヒアリング</option>
              <option value="quoted">見積提出</option>
              <option value="won">受注</option>
              <option value="in_progress">進行中</option>
              <option value="delivered">納品</option>
              <option value="lost">失注</option>
            </select>
          </label>
          <button className="rounded-lg bg-zinc-900 px-5 py-2.5 font-semibold text-white">登録</button>
        </form>
      )}
    </div>
  );
}
