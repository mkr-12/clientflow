"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) redirect("/login?error=invalid-input");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirect("/login?error=login-failed");
  redirect("/dashboard");
}

export async function demoLogin() {
  const email = process.env.DEMO_USER_EMAIL?.trim();
  const passwordBase64 = process.env.DEMO_USER_PASSWORD_B64;

  if (!email || !passwordBase64) redirect("/login?error=demo-unavailable");

  let password: string;
  try {
    password = Buffer.from(passwordBase64, "base64").toString("utf8");
  } catch {
    redirect("/login?error=demo-unavailable");
  }

  if (!password) redirect("/login?error=demo-unavailable");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("demo login failed", { code: error.code });
    redirect("/login?error=demo-login-failed");
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
