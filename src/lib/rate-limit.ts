import "server-only";

import { createHmac } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

type RateLimitRpcResult = {
  allowed?: unknown;
  remaining?: unknown;
  reset_at?: unknown;
};

function hashRateLimitKey(key: string) {
  const pepper = process.env.RATE_LIMIT_PEPPER;

  if (!pepper) {
    throw new Error("Rate limit pepper is not configured.");
  }

  return createHmac("sha256", pepper).update(key).digest("hex");
}

export async function checkRateLimit(key: string) {
  const admin = createAdminClient();
  const keyHash = hashRateLimitKey(key);

  const { data, error } = await admin.rpc(
    "consume_public_inquiry_rate_limit",
    { p_key_hash: keyHash },
  );

  if (error) {
    console.error("consume_public_inquiry_rate_limit failed", {
      code: error.code,
    });

    return {
      ok: false as const,
      allowed: false as const,
      remaining: null,
      resetAt: null,
    };
  }

  const result = data as RateLimitRpcResult | null;

  if (!result || typeof result.allowed !== "boolean") {
    console.error("consume_public_inquiry_rate_limit returned invalid data");

    return {
      ok: false as const,
      allowed: false as const,
      remaining: null,
      resetAt: null,
    };
  }

  return {
    ok: true as const,
    allowed: result.allowed,
    remaining:
      typeof result.remaining === "number" ? result.remaining : null,
    resetAt:
      typeof result.reset_at === "string" ? result.reset_at : null,
  };
}
