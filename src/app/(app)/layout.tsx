import { AppShell } from "@/components/app-shell";
import { requireOrganization } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { organization } = await requireOrganization();
  const organizationName = Array.isArray(organization)
    ? organization[0]?.name ?? "Workspace"
    : organization?.name ?? "Workspace";

  return <AppShell organizationName={organizationName}>{children}</AppShell>;
}
