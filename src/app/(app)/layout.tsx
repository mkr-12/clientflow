import { AppShell } from "@/components/app-shell";
import { requireOrganization } from "@/lib/auth";

type OrganizationSummary = {
  name: string;
  slug: string;
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { organization } = await requireOrganization();

  const normalizedOrganization = (
    Array.isArray(organization) ? organization[0] : organization
  ) as OrganizationSummary | null | undefined;

  const organizationName = normalizedOrganization?.name ?? "Workspace";

  return <AppShell organizationName={organizationName}>{children}</AppShell>;
}
