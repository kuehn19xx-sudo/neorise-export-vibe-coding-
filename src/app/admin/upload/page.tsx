import { CarIngestForm } from "@/components/car-ingest-form";
import Link from "next/link";

export default function AdminUploadPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Admin only: upload photos + text or voice description (mobile supported), then auto-ingest to live inventory.
      </div>
      <div className="mb-6">
        <Link
          href="/admin/cars"
          className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:border-slate-500"
        >
          Open Car List Management
        </Link>
      </div>
      <CarIngestForm requireAdminToken />
    </main>
  );
}
