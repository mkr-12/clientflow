"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOrganization } from "@/lib/auth";

const clientSchema = z.object({
  companyName: z.string().trim().min(1).max(120),
  contactName: z.string().trim().min(1).max(100),
  email: z.email().max(254),
  phone: z.string().trim().max(50).optional(),
});

function parseClient(formData: FormData) {
  const phone = String(formData.get("phone") ?? "").trim();

  return clientSchema.safeParse({
    companyName: formData.get("companyName"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    phone: phone || undefined,
  });
}

export async function createClient(formData: FormData) {
  const parsed = parseClient(formData);
  if (!parsed.success) redirect("/clients/new?error=invalid");

  const { supabase, organizationId, userId } = await requireOrganization();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      organization_id: organizationId,
      company_name: parsed.data.companyName,
      contact_name: parsed.data.contactName,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone ?? null,
      created_by: userId,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("create client failed", { code: error?.code });
    redirect("/clients/new?error=save-failed");
  }

  revalidatePath("/clients");
  redirect(`/clients/${data.id}?status=created`);
}

export async function updateClient(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id"));
  const parsed = parseClient(formData);
  if (!id.success || !parsed.success) redirect("/clients?error=invalid");

  const { supabase, organizationId } = await requireOrganization();
  const { data, error } = await supabase
    .from("clients")
    .update({
      company_name: parsed.data.companyName,
      contact_name: parsed.data.contactName,
      email: parsed.data.email.toLowerCase(),
      phone: parsed.data.phone ?? null,
    })
    .eq("id", id.data)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("update client failed", { code: error?.code });
    redirect(`/clients/${id.data}?error=save-failed`);
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${id.data}`);
  redirect(`/clients/${id.data}?status=updated`);
}

export async function deleteClient(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/clients?error=invalid");

  const { supabase, organizationId } = await requireOrganization();
  const { count, error: countError } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .eq("client_id", id.data)
    .is("deleted_at", null);

  if (countError) {
    console.error("client project count failed", { code: countError.code });
    redirect(`/clients/${id.data}?error=delete-failed`);
  }
  if ((count ?? 0) > 0) redirect(`/clients/${id.data}?error=has-projects`);

  const { data, error } = await supabase
    .from("clients")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id.data)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("delete client failed", { code: error?.code });
    redirect(`/clients/${id.data}?error=delete-failed`);
  }

  revalidatePath("/clients");
  redirect("/clients?status=deleted");
}
