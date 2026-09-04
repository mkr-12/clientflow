import { submitInquiry } from "./actions";

const messages: Record<string, string> = {
  success: "お問い合わせを受け付けました。",
  invalid: "入力内容を確認してください。",
  "rate-limited": "短時間に送信回数が多いため、時間を空けて再度お試しください。",
  failed: "送信に失敗しました。時間を空けて再度お試しください。",
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  return (
    <main className="mx-auto min-h-screen max-w-2xl p-6 py-12">
      <p className="text-sm font-semibold text-zinc-500">ClientFlow Demo</p>
      <h1 className="mt-2 text-3xl font-bold">お問い合わせ</h1>
      <p className="mt-2 text-zinc-600">送信内容は新規案件として管理画面に登録されます。</p>
      {status && messages[status] && <p className="mt-6 rounded-xl bg-white p-4 text-sm shadow-sm">{messages[status]}</p>}
      <form action={submitInquiry} className="mt-8 space-y-5 rounded-2xl border border-zinc-200 bg-white p-6">
        <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <label className="block text-sm font-medium">会社名<input name="companyName" required maxLength={120} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" /></label>
        <label className="block text-sm font-medium">担当者名<input name="contactName" required maxLength={80} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" /></label>
        <label className="block text-sm font-medium">メールアドレス<input name="email" type="email" required maxLength={254} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" /></label>
        <label className="block text-sm font-medium">件名<input name="subject" required maxLength={160} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" /></label>
        <label className="block text-sm font-medium">お問い合わせ内容<textarea name="message" required minLength={10} maxLength={5000} rows={7} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2" /></label>
        <button className="rounded-lg bg-zinc-900 px-5 py-2.5 font-semibold text-white">送信</button>
      </form>
    </main>
  );
}
