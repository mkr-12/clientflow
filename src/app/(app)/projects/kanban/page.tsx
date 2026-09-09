import Link from "next/link";
import { requireOrganization } from "@/lib/auth";
import KanbanBoard, {
  KanbanProject,
  KanbanStatus,
} from "./kanban-board";

const validStatuses = new Set<KanbanStatus>([
  "new",
  "hearing",
  "quoted",
  "won",
  "in_progress",
  "delivered",
  "lost",
]);

export default async function KanbanPage() {
  const { supabase, organizationId } = await requireOrganization();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id,title,status,amount,clients(company_name)")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const kanbanProjects: KanbanProject[] = (projects ?? [])
    .filter((project) => validStatuses.has(project.status as KanbanStatus))
    .map((project) => {
      const client = Array.isArray(project.clients)
        ? project.clients[0]
        : project.clients;

      return {
        id: project.id,
        title: project.title,
        status: project.status as KanbanStatus,
        amount: project.amount,
        clientName: client?.company_name ?? null,
      };
    });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-500">Pipeline</p>
          <h1 className="text-2xl font-bold">Kanban</h1>
        </div>
        <Link
          href="/projects"
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold"
        >
          案件一覧へ
        </Link>
      </div>

      <p className="mb-4 text-sm text-zinc-500">
        カードを別の列へドラッグすると、案件ステータスを変更してDBへ保存します。
      </p>

      {error ? (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          Kanbanの読み込みに失敗しました。時間を空けて再度お試しください。
        </p>
      ) : (
        <KanbanBoard projects={kanbanProjects} />
      )}
    </div>
  );
}
