import Link from "next/link";
import { createClient } from "../actions";

export default async function NewClientPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/clients" className="text-sm text-zinc-500 hover:text-zinc-900">← 顧客一覧へ</Link>
      <p className="mt-6 text-sm text-zinc-500">Customer</p>
      <h1 className="text-2xl font-bold">顧客を登録</h1>

      {error && (
        <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error === "invalid" ? "入力内容を確認してください。" : "保存に失敗しました。時間を空けて再度お試しください。"}
        </p>
      )}

      <form action={createClient} className="mt-6 space-y-5 rounded-2xl border border-zinc-200 bg-white p-6">
        <label className="block text-sm font-medium">会社名
          <input name="companyName" required maxLength={120} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">担当者名
          <input name="contactName" required maxLength={100} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">メールアドレス
          <input name="email" type="email" required maxLength={254} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">電話番号
          <input name="phone" maxLength={50} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" />
        </label>
        <button className="rounded-lg bg-zinc-900 px-5 py-2.5 font-semibold text-white">登録</button>
      </form>
    </div>
  );
}
