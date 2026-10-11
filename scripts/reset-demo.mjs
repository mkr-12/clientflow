import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const slug = process.env.DEMO_ORGANIZATION_SLUG;
const confirmation = process.env.DEMO_RESET_CONFIRM;

function fail(message) {
  console.error(`Demo reset aborted: ${message}`);
  process.exit(1);
}

if (!url) fail("NEXT_PUBLIC_SUPABASE_URL is missing.");
if (!secret) fail("SUPABASE_SECRET_KEY is missing.");
if (slug !== "clientflow-demo") fail("DEMO_ORGANIZATION_SLUG must be exactly clientflow-demo.");
if (confirmation !== slug) {
  fail("Set DEMO_RESET_CONFIRM=clientflow-demo for this one command.");
}

const supabase = createClient(url, secret, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const { data, error } = await supabase.rpc("reset_demo_organization", {
  p_org_slug: slug,
});

if (error) {
  console.error("Demo reset failed:", {
    code: error.code,
    message: error.message,
  });
  process.exit(1);
}

const expectedStatuses = {
  new: 1,
  hearing: 1,
  quoted: 1,
  won: 1,
  in_progress: 1,
  delivered: 1,
  lost: 1,
};

const actualStatuses = data?.project_statuses ?? {};
const statusesOk = Object.entries(expectedStatuses).every(
  ([key, value]) => Number(actualStatuses[key]) === value,
);

const checks = [
  data?.organization_slug === "clientflow-demo",
  Number(data?.clients) === 5,
  Number(data?.projects) === 7,
  Number(data?.activities) === 9,
  Number(data?.inquiries) === 2,
  Number(data?.audit_logs) === 2,
  statusesOk,
];

if (checks.some((ok) => !ok)) {
  console.error("Demo reset returned unexpected counts:", data);
  process.exit(1);
}

console.log("Demo reset completed.");
console.log(JSON.stringify(data, null, 2));
