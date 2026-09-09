"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { updateProjectStatus } from "../actions";

export const kanbanColumns = [
  { id: "new", label: "新規" },
  { id: "hearing", label: "ヒアリング" },
  { id: "quoted", label: "見積提出" },
  { id: "won", label: "受注" },
  { id: "in_progress", label: "進行中" },
  { id: "delivered", label: "納品" },
  { id: "lost", label: "失注" },
] as const;

export type KanbanStatus = (typeof kanbanColumns)[number]["id"];

export type KanbanProject = {
  id: string;
  title: string;
  status: KanbanStatus;
  amount: number | null;
  clientName: string | null;
};

function isKanbanStatus(value: unknown): value is KanbanStatus {
  return kanbanColumns.some((column) => column.id === value);
}

function ProjectCard({
  project,
  disabled = false,
}: {
  project: KanbanProject;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id: project.id,
      data: { status: project.status },
      disabled,
    });

  const style = { touchAction: "none" as const };

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={[
        "cursor-grab rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition",
        "active:cursor-grabbing",
        isDragging ? "z-20 opacity-40" : "",
        disabled ? "cursor-wait opacity-60" : "",
      ].join(" ")}
    >
      <p className="font-semibold">{project.title}</p>
      <p className="mt-1 text-xs text-zinc-500">
        {project.clientName ?? "顧客未設定"}
      </p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-sm">
          ¥{Number(project.amount ?? 0).toLocaleString("ja-JP")}
        </p>
        <Link
          href={`/projects/${project.id}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-900"
        >
          詳細
        </Link>
      </div>
    </article>
  );
}

function KanbanColumn({
  status,
  label,
  projects,
  savingId,
}: {
  status: KanbanStatus;
  label: string;
  projects: KanbanProject[];
  savingId: string | null;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <section
      ref={setNodeRef}
      className={[
        "w-72 shrink-0 rounded-2xl border p-3 transition",
        isOver
          ? "border-zinc-500 bg-zinc-200"
          : "border-transparent bg-zinc-100",
      ].join(" ")}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">{label}</h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-zinc-500">
          {projects.length}
        </span>
      </div>

      <div className="min-h-24 space-y-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            disabled={savingId === project.id}
          />
        ))}
        {projects.length === 0 && (
          <div className="rounded-xl border border-dashed border-zinc-300 p-5 text-center text-xs text-zinc-400">
            ここにドロップ
          </div>
        )}
      </div>
    </section>
  );
}

export default function KanbanBoard({
  projects,
}: {
  projects: KanbanProject[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(projects);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  const activeProject = useMemo(
    () => items.find((project) => project.id === activeId) ?? null,
    [activeId, items],
  );

  function handleDragStart(event: DragStartEvent) {
    if (savingId) return;
    setMessage(null);
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);

    if (savingId || !event.over) return;

    const projectId = String(event.active.id);
    const nextStatus = event.over.id;

    if (!isKanbanStatus(nextStatus)) return;

    const current = items.find((project) => project.id === projectId);
    if (!current || current.status === nextStatus) return;

    const previousItems = items;
    setItems((currentItems) =>
      currentItems.map((project) =>
        project.id === projectId
          ? { ...project, status: nextStatus }
          : project,
      ),
    );
    setSavingId(projectId);
    setMessage("保存中…");

    try {
      const result = await updateProjectStatus(projectId, nextStatus);

      if (!result.ok) {
        setItems(previousItems);
        setMessage("ステータスを保存できませんでした。元の状態に戻しました。");
        return;
      }

      const label =
        kanbanColumns.find((column) => column.id === nextStatus)?.label ??
        nextStatus;
      const successMessage = `「${current.title}」を「${label}」へ移動しました。`;
      setMessage(successMessage);
      window.setTimeout(() => {
        setMessage((currentMessage) =>
          currentMessage === successMessage ? null : currentMessage,
        );
      }, 6000);
      router.refresh();
    } catch {
      setItems(previousItems);
      setMessage("ステータスを保存できませんでした。元の状態に戻しました。");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      {message && (
        <div
          role="status"
          aria-live="polite"
          className={[
            "mb-4 flex items-center justify-between gap-4 rounded-xl p-3 text-sm",
            message.includes("できませんでした")
              ? "bg-red-50 text-red-700"
              : message === "保存中…"
                ? "bg-zinc-100 text-zinc-700"
                : "bg-emerald-50 text-emerald-700",
          ].join(" ")}
        >
          <span>{message}</span>
          {message !== "保存中…" && (
            <button
              type="button"
              onClick={() => setMessage(null)}
              className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold hover:bg-black/5"
            >
              閉じる
            </button>
          )}
        </div>
      )}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {kanbanColumns.map((column) => (
          <KanbanColumn
            key={column.id}
            status={column.id}
            label={column.label}
            projects={items.filter((project) => project.status === column.id)}
            savingId={savingId}
          />
        ))}
      </div>

      <DragOverlay>
        {activeProject ? (
          <div className="w-64 rotate-1 rounded-xl border border-zinc-300 bg-white p-4 shadow-xl">
            <p className="font-semibold">{activeProject.title}</p>
            <p className="mt-1 text-xs text-zinc-500">
              {activeProject.clientName ?? "顧客未設定"}
            </p>
            <p className="mt-3 text-sm">
              ¥{Number(activeProject.amount ?? 0).toLocaleString("ja-JP")}
            </p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
