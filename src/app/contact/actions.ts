"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { inquirySchema } from "@/lib/validation/inquiry";

export async function submitInquiry(formData: FormData) {
  const parsed = inquirySchema.safeParse({
    companyName: formData.get("companyName"),
    contactName: formData.get("contactName"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
    website: formData.get("website") || undefined,
  });

  if (!parsed.success || parsed.data.website) {
    redirect("/contact?status=invalid");
  }

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rateLimit = await checkRateLimit(ip);

  if (!rateLimit.ok) {
    redirect("/contact?status=failed");
  }

  if (!rateLimit.allowed) {
    redirect("/contact?status=rate-limited");
  }

  const orgSlug = process.env.DEMO_ORGANIZATION_SLUG;
  if (!orgSlug) throw new Error("Inquiry organization is not configured.");

  const admin = createAdminClient();
  const { error } = await admin.rpc("submit_public_inquiry", {
    p_org_slug: orgSlug,
    p_company_name: parsed.data.companyName,
    p_contact_name: parsed.data.contactName,
    p_email: parsed.data.email,
    p_subject: parsed.data.subject,
    p_message: parsed.data.message,
  });

  if (error) {
    console.error("submit_public_inquiry failed", { code: error.code });
    redirect("/contact?status=failed");
  }

  redirect("/contact?status=success");
}
