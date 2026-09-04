import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (error || !userId) {
    redirect("/login");
  }

  return { supabase, userId };
}

export async function requireOrganization() {
  const { supabase, userId } = await requireUser();

  const { data: membership, error } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(name, slug)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error || !membership) {
    redirect("/login?error=no-organization");
  }

  return {
    supabase,
    userId,
    organizationId: membership.organization_id as string,
    role: membership.role as "admin" | "member",
    organization: membership.organizations,
  };
}
