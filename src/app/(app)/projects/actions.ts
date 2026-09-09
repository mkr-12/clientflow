"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOrganization } from "@/lib/auth";

const projectStatus = z.enum(["new", "hearing", "quoted", "won", "in_progress", "delivered", "lost"]);

const manualActivitySchema = z.object({
  projectId: z.string().uuid(),
  type: z.enum(["call", "meeting", "email", "quote_sent", "note", "other"]),
  content: z.string().trim().min(1).max(5000),
});

const projectSchema = z.object({
  clientId: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(5000).optional(),
  internalNote: z.string().trim().max(5000).optional(),
  amount: z.coerce.number().int().min(0).max(2147483647),
  status: projectStatus,
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function parseProject(formData: FormData) {
  const description = String(formData.get("description") ?? "").trim();
  const internalNote = String(formData.get("internalNote") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "").trim();

  return projectSchema.safeParse({
    clientId: formData.get("clientId"),
    title: formData.get("title"),
    description: description || undefined,
    internalNote: internalNote || undefined,
    amount: formData.get("amount"),
    status: formData.get("status"),
    dueDate: dueDate || undefined,
  });
}

async function clientExists(
  supabase: Awaited<ReturnType<typeof requireOrganization>>["supabase"],
  organizationId: string,
  clientId: string,
) {
  const { data } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  return Boolean(data);
}

export async function createProject(formData: FormData) {
  const parsed = parseProject(formData);
  if (!parsed.success) redirect("/projects/new?error=invalid");

  const { supabase, organizationId, userId } = await requireOrganization();
  if (!(await clientExists(supabase, organizationId, parsed.data.clientId))) {
    redirect("/projects/new?error=invalid-client");
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      organization_id: organizationId,
      client_id: parsed.data.clientId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      internal_note: parsed.data.internalNote ?? null,
      amount: parsed.data.amount,
      status: parsed.data.status,
      due_date: parsed.data.dueDate ?? null,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("create project failed", { code: error?.code });
    redirect("/projects/new?error=save-failed");
  }

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  revalidatePath("/clients");
  redirect(`/projects/${data.id}?status=created`);
}

export async function updateProject(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id"));
  const parsed = parseProject(formData);
  if (!id.success || !parsed.success) redirect("/projects?error=invalid");

  const { supabase, organizationId } = await requireOrganization();
  if (!(await clientExists(supabase, organizationId, parsed.data.clientId))) {
    redirect(`/projects/${id.data}?error=invalid-client`);
  }

  const { data, error } = await supabase
    .from("projects")
    .update({
      client_id: parsed.data.clientId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      internal_note: parsed.data.internalNote ?? null,
      amount: parsed.data.amount,
      status: parsed.data.status,
      due_date: parsed.data.dueDate ?? null,
    })
    .eq("id", id.data)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("update project failed", { code: error?.code });
    redirect(`/projects/${id.data}?error=save-failed`);
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${id.data}`);
  revalidatePath("/projects/kanban");
  revalidatePath("/dashboard");
  revalidatePath("/clients");
  redirect(`/projects/${id.data}?status=updated`);
}

export async function deleteProject(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/projects?error=invalid");

  const { supabase, organizationId } = await requireOrganization();
  const { data, error } = await supabase
    .from("projects")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id.data)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("delete project failed", { code: error?.code });
    redirect(`/projects/${id.data}?error=delete-failed`);
  }

  revalidatePath("/projects");
  revalidatePath("/projects/kanban");
  revalidatePath("/dashboard");
  revalidatePath("/clients");
  redirect("/projects?status=deleted");
}


export async function createActivity(formData: FormData) {
  const parsed = manualActivitySchema.safeParse({
    projectId: formData.get("projectId"),
    type: formData.get("type"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    const projectId = z.string().uuid().safeParse(formData.get("projectId"));
    if (projectId.success) {
      redirect(`/projects/${projectId.data}?error=invalid-activity`);
    }
    redirect("/projects?error=invalid");
  }

  const { supabase, organizationId, userId } = await requireOrganization();

  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", parsed.data.projectId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!project) {
    redirect("/projects?error=invalid");
  }

  const { error } = await supabase.from("activities").insert({
    organization_id: organizationId,
    project_id: parsed.data.projectId,
    type: parsed.data.type,
    content: parsed.data.content,
    user_id: userId,
  });

  if (error) {
    console.error("create activity failed", { code: error.code });
    redirect(`/projects/${parsed.data.projectId}?error=activity-save-failed`);
  }

  revalidatePath(`/projects/${parsed.data.projectId}`);
  redirect(`/projects/${parsed.data.projectId}?status=activity-added`);
}

export async function updateProjectStatus(projectId: string, nextStatus: string) {
  const id = z.string().uuid().safeParse(projectId);
  const status = projectStatus.safeParse(nextStatus);

  if (!id.success || !status.success) {
    return { ok: false, error: "invalid" } as const;
  }

  const { supabase, organizationId } = await requireOrganization();
  const { data, error } = await supabase
    .from("projects")
    .update({ status: status.data })
    .eq("id", id.data)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .select("id,status")
    .maybeSingle();

  if (error || !data) {
    console.error("update project status failed", { code: error?.code });
    return { ok: false, error: "save-failed" } as const;
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${id.data}`);
  revalidatePath("/projects/kanban");
  revalidatePath("/dashboard");
  revalidatePath("/clients");

  return { ok: true, status: data.status } as const;
}
