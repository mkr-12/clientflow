import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-zinc-500">ClientFlow</p>
        <h1 className="mt-2 text-2xl font-bold">ページを表示できません</h1>
        <p className="mt-3 text-sm text-zinc-600">
          ページが存在しないか、このデータを表示する権限がありません。
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          ダッシュボードへ戻る
        </Link>
      </section>
    </main>
  );
}
