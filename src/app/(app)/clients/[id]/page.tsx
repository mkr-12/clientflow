import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteClient, updateClient } from "../actions";
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

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, organizationId } = await requireOrganization();

  const [{ data: client }, { data: projects }] = await Promise.all([
    supabase
      .from("clients")
      .select("id,company_name,contact_name,email,phone,created_at")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("projects")
      .select("id,title,status,amount")
      .eq("organization_id", organizationId)
      .eq("client_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  if (!client) notFound();

  return (
    <div>
      <Link href="/clients" className="text-sm text-zinc-500 hover:text-zinc-900">← 顧客一覧へ</Link>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <p className="text-sm text-zinc-500">顧客詳細</p>
          <h1 className="mt-1 text-2xl font-bold">{client.company_name}</h1>
          <p className="mt-1 text-sm text-zinc-500">{client.contact_name}</p>

          {query.status && (
            <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
              {query.status === "created" ? "顧客を登録しました。" : "顧客情報を更新しました。"}
            </p>
          )}
          {query.error && (
            <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {query.error === "has-projects" ? "進行中の案件がある顧客は削除できません。先に案件を削除してください。" : "操作を完了できませんでした。"}
            </p>
          )}

          <h2 className="mt-8 font-semibold">関連案件</h2>
          <div className="mt-3 space-y-3">
            {(projects ?? []).map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`} className="grid gap-2 rounded-xl bg-zinc-50 p-4 hover:bg-zinc-100 sm:grid-cols-[1fr_120px_120px]">
                <p className="font-medium">{project.title}</p>
                <p className="text-sm text-zinc-500">{statusLabel[project.status] ?? project.status}</p>
                <p className="text-sm font-medium">¥{Number(project.amount ?? 0).toLocaleString("ja-JP")}</p>
              </Link>
            ))}
            {!projects?.length && (
              <p className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">この顧客の案件はまだありません。</p>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <form action={updateClient} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="font-semibold">顧客情報を編集</h2>
            <input type="hidden" name="id" value={client.id} />
            <label className="block text-sm font-medium">会社名
              <input name="companyName" required maxLength={120} defaultValue={client.company_name} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium">担当者名
              <input name="contactName" required maxLength={100} defaultValue={client.contact_name} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium">メールアドレス
              <input name="email" type="email" required maxLength={254} defaultValue={client.email} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-medium">電話番号
              <input name="phone" maxLength={50} defaultValue={client.phone ?? ""} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
            </label>
            <button className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 font-semibold text-white">更新</button>
          </form>

          <form action={deleteClient} className="rounded-2xl border border-red-200 bg-white p-6">
            <input type="hidden" name="id" value={client.id} />
            <h2 className="font-semibold text-red-700">顧客を削除</h2>
            <p className="mt-2 text-xs text-zinc-500">データは論理削除されます。案件が残っている場合は削除できません。</p>
            <button disabled={Boolean(projects?.length)} className="mt-4 w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-40">削除</button>
          </form>
        </aside>
      </div>
    </div>
  );
}
