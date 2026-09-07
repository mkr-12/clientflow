import Link from "next/link";
import { requireOrganization } from "@/lib/auth";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { supabase, organizationId } = await requireOrganization();
  const { data: clients } = await supabase
    .from("clients")
    .select("id,company_name,contact_name,email,phone,projects(id,deleted_at)")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">Customers</p>
          <h1 className="text-2xl font-bold">顧客一覧</h1>
        </div>
        <Link href="/clients/new" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
          顧客を登録
        </Link>
      </div>

      {params.status === "deleted" && (
        <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">顧客を削除しました。</p>
      )}
      {params.error && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">操作を完了できませんでした。</p>
      )}

      <div className="grid gap-3">
        {(clients ?? []).map((client) => {
          const activeProjectCount = client.projects?.filter((project) => !project.deleted_at).length ?? 0;
          return (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-300 hover:bg-zinc-50 sm:grid sm:grid-cols-[1fr_1fr_100px] sm:items-center"
            >
              <div>
                <p className="font-semibold">{client.company_name}</p>
                <p className="text-sm text-zinc-500">{client.contact_name}</p>
              </div>
              <p className="mt-2 text-sm sm:mt-0">{client.email}</p>
              <p className="mt-2 text-sm text-zinc-500 sm:mt-0">案件 {activeProjectCount}件</p>
            </Link>
          );
        })}

        {!clients?.length && (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center">
            <p className="text-sm text-zinc-500">顧客はまだ登録されていません。</p>
            <Link href="/clients/new" className="mt-4 inline-block text-sm font-semibold underline">最初の顧客を登録する</Link>
          </div>
        )}
      </div>
    </div>
  );
}
