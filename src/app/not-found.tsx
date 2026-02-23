import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="text-slate-600">The page you requested does not exist.</p>
      <Link href="/en" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
        Back to home
      </Link>
    </div>
  );
}
