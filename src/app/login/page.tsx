import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const hasError = Boolean(params.error);

  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-zinc-500">ClientFlow</p>
        <h1 className="text-2xl font-bold">ログイン</h1>
        <p className="mt-2 text-sm text-zinc-600">案件・顧客・問い合わせを一元管理します。</p>

        {hasError && (
          <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            ログインできませんでした。入力内容を確認してください。
          </p>
        )}

        <form action={login} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            メールアドレス
            <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            パスワード
            <input name="password" type="password" required className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
          </label>
          <button className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 font-semibold text-white">ログイン</button>
        </form>

        <p className="mt-5 text-xs text-zinc-500">
          デモアカウント導線はSupabase環境作成後に追加します。
        </p>
      </section>
    </main>
  );
}
