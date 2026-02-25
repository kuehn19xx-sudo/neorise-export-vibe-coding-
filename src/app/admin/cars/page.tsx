import Link from "next/link";

import { AdminCarList } from "@/components/admin-car-list";

export default function AdminCarsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Admin only: manage imported cars and down-shelf listings by setting status to hidden.
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/admin/upload"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:border-slate-500"
        >
          Go to Upload
        </Link>
      </div>

      <AdminCarList />
    </main>
  );
}
