import { requireOrganization } from "@/lib/auth";

export default async function ClientsPage() {
  const { supabase, organizationId } = await requireOrganization();
  const { data: clients } = await supabase
    .from("clients")
    .select("id,company_name,contact_name,email,phone,projects(id)")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <p className="text-sm text-zinc-500">Customers</p>
      <h1 className="mb-6 text-2xl font-bold">顧客一覧</h1>
      <div className="grid gap-3">
        {(clients ?? []).map((client) => (
          <article key={client.id} className="rounded-2xl border border-zinc-200 bg-white p-5 sm:grid sm:grid-cols-[1fr_1fr_100px] sm:items-center">
            <div><p className="font-semibold">{client.company_name}</p><p className="text-sm text-zinc-500">{client.contact_name}</p></div>
            <p className="mt-2 text-sm sm:mt-0">{client.email}</p>
            <p className="mt-2 text-sm text-zinc-500 sm:mt-0">案件 {client.projects?.length ?? 0}件</p>
          </article>
        ))}
      </div>
    </div>
  );
}
