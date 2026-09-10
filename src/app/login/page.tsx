import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { demoLogin, login } from "./actions";

const errorMessage: Record<string, string> = {
  "invalid-input": "メールアドレスとパスワードを入力してください。",
  "login-failed": "ログインできませんでした。入力内容を確認してください。",
  "no-organization": "利用可能なワークスペースがありません。",
  "demo-unavailable": "デモアカウントは現在利用できません。",
  "demo-login-failed": "デモアカウントへログインできませんでした。",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (!error && data?.claims?.sub) redirect("/dashboard");

  const message = params.error
    ? (errorMessage[params.error] ?? "ログインできませんでした。")
    : null;

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-zinc-500">ClientFlow</p>
        <h1 className="text-2xl font-bold">ログイン</h1>
        <p className="mt-2 text-sm text-zinc-600">
          案件・顧客・問い合わせを一元管理します。
        </p>

        {message && (
          <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {message}
          </p>
        )}

        <form action={login} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            メールアドレス
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium">
            パスワード
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
            />
          </label>
          <button className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 font-semibold text-white">
            ログイン
          </button>
        </form>

        <div className="my-5 flex items-center gap-3" aria-hidden="true">
          <span className="h-px flex-1 bg-zinc-200" />
          <span className="text-xs text-zinc-400">または</span>
          <span className="h-px flex-1 bg-zinc-200" />
        </div>

        <form action={demoLogin}>
          <button className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 font-semibold text-zinc-800 hover:bg-zinc-50">
            デモアカウントで試す
          </button>
        </form>

        <p className="mt-3 text-center text-xs text-zinc-500">
          登録不要でClientFlowの管理画面を確認できます。
        </p>
      </section>
    </main>
  );
}
