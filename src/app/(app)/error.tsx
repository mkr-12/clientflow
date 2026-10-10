"use client";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
      <h1 className="text-lg font-bold text-red-800">画面を読み込めませんでした</h1>
      <p className="mt-2 text-sm text-red-700">
        一時的な通信エラーの可能性があります。再試行してください。
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
      >
        再試行
      </button>
    </div>
  );
}
