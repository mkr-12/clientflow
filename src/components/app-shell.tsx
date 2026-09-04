import Link from "next/link";
import { logout } from "@/app/login/actions";

const nav = [
  ["ダッシュボード", "/dashboard"],
  ["案件一覧", "/projects"],
  ["Kanban", "/projects/kanban"],
  ["顧客", "/clients"],
] as const;

export function AppShell({ children, organizationName }: { children: React.ReactNode; organizationName: string }) {
  return (
    <div className="min-h-screen bg-zinc-50 md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b border-zinc-200 bg-white p-5 md:min-h-screen md:border-b-0 md:border-r">
        <div className="mb-8">
          <p className="text-lg font-bold">ClientFlow</p>
          <p className="mt-1 truncate text-xs text-zinc-500">{organizationName}</p>
        </div>
        <nav className="flex gap-2 overflow-x-auto md:flex-col">
          {nav.map(([label, href]) => (
            <Link key={href} href={href} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100">
              {label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="mt-6">
          <button className="text-sm text-zinc-500 hover:text-zinc-900">ログアウト</button>
        </form>
      </aside>
      <main className="min-w-0 p-5 md:p-8">{children}</main>
    </div>
  );
}
