import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type LooseSupabaseRow = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};
type LooseSupabaseDatabase = {
  public: {
    Tables: Record<string, LooseSupabaseRow>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
type AdminClient = ReturnType<typeof createClient<LooseSupabaseDatabase>>;

const SUPPORTED_IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient<LooseSupabaseDatabase>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function requireAdminToken(request: Request): NextResponse | null {
  const requiredAdminToken = process.env.ADMIN_INGEST_TOKEN;
  if (!requiredAdminToken) {
    return NextResponse.json(
      {
        error: "Server is missing ADMIN_INGEST_TOKEN",
        hint: "Set ADMIN_INGEST_TOKEN in server env, then restart the app.",
      },
      { status: 500 },
    );
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieToken =
    cookieHeader
      .split(";")
      .map((chunk) => chunk.trim())
      .find((chunk) => chunk.startsWith("admin_token="))
      ?.slice("admin_token=".length) ?? "";
  const providedToken = request.headers.get("x-admin-token")?.trim() || cookieToken.trim();
  if (providedToken !== requiredAdminToken) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        hint: "Provide valid x-admin-token in request headers.",
      },
      { status: 401 },
    );
  }
  return null;
}

function sanitizeImageFiles(files: File[]): File[] {
  return files.filter((file) => SUPPORTED_IMAGE_EXTS.has(path.extname(file.name).toLowerCase()));
}

function buildSafeStorageFileName(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const base = path.basename(originalName, ext);
  const normalizedBase = base
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const fallbackBase = normalizedBase || "image";
  const safeExt = SUPPORTED_IMAGE_EXTS.has(ext) ? ext : ".jpg";
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${fallbackBase}${safeExt}`;
}

function parseOrderedItems(raw: FormDataEntryValue | null): string[] {
  if (!raw || typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    output.push(item);
  }
  return output;
}

async function readExistingImages(supabase: AdminClient, carId: string) {
  const { data, error } = await supabase
    .from("car_images")
    .select("image_url,sort_order")
    .eq("car_id", carId)
    .order("sort_order", { ascending: true });
  if (error) {
    throw new Error(`Failed to read public.car_images: ${error.message}`);
  }
  const rows = (data ?? []) as Array<{ image_url?: unknown; sort_order?: unknown }>;
  return rows
    .map((row) => ({
      image_url: String(row.image_url ?? ""),
      sort_order: Number(row.sort_order ?? 0),
    }))
    .filter((row) => row.image_url);
}

async function uploadNewImage(
  supabase: AdminClient,
  carId: string,
  file: File,
): Promise<string> {
  const bucket = process.env.SUPABASE_BUCKET_CAR_IMAGES || "car-images";
  const prefix = process.env.SUPABASE_CAR_IMAGES_PREFIX || "car";
  const safeName = buildSafeStorageFileName(file.name);
  const storagePath = `${prefix}/${carId}/${safeName}`;
  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, fileBytes, {
    contentType: file.type || undefined,
    upsert: true,
  });
  if (uploadError) {
    throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
  }
  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(storagePath);
  if (!publicData?.publicUrl) {
    throw new Error(`Failed to create public URL for ${file.name}`);
  }
  return publicData.publicUrl;
}

async function replaceCarImages(
  supabase: AdminClient,
  carId: string,
  nextImageUrls: string[],
  fallbackRows: Array<{ image_url: string; sort_order: number }>,
) {
  const { error: deleteError } = await supabase.from("car_images").delete().eq("car_id", carId);
  if (deleteError) {
    throw new Error(`Failed to clear old public.car_images rows: ${deleteError.message}`);
  }

  if (nextImageUrls.length === 0) return;

  const rowsToInsert = nextImageUrls.map((url, index) => ({
    car_id: carId,
    image_url: url,
    sort_order: index,
  }));
  const { error: insertError } = await supabase.from("car_images").insert(rowsToInsert);
  if (!insertError) return;

  if (fallbackRows.length > 0) {
    await supabase.from("car_images").insert(
      fallbackRows
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((row, index) => ({
          car_id: carId,
          image_url: row.image_url,
          sort_order: index,
        })),
    );
  }
  throw new Error(`Failed to write public.car_images rows: ${insertError.message}`);
}

export async function GET(request: Request) {
  const authError = requireAdminToken(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const carId = (searchParams.get("car_id") || "").trim();
    if (!carId) {
      return NextResponse.json(
        { error: "car_id is required", hint: "Pass ?car_id=<id> in request query." },
        { status: 400 },
      );
    }

    const supabase = getAdminClient();
    const rows = await readExistingImages(supabase, carId);
    return NextResponse.json({
      images: rows.map((row) => ({
        image_url: row.image_url,
        sort_order: row.sort_order,
      })),
      image_count: rows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: message,
        hint: "Verify public.car_images table exists and service role key has read permission.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authError = requireAdminToken(request);
  if (authError) return authError;

  try {
    const formData = await request.formData();
    const carId = String(formData.get("car_id") ?? "").trim();
    if (!carId) {
      return NextResponse.json(
        { error: "car_id is required", hint: "Provide car_id in formData." },
        { status: 400 },
      );
    }

    const orderedItems = parseOrderedItems(formData.get("ordered_items"));
    if (orderedItems.length === 0) {
      return NextResponse.json(
        { error: "ordered_items is required", hint: "Provide ordered_items JSON array in formData." },
        { status: 400 },
      );
    }

    const supabase = getAdminClient();
    const existingRows = await readExistingImages(supabase, carId);
    const existingUrls = new Set(existingRows.map((row) => row.image_url));

    const allUploadedFiles = formData.getAll("images").filter((item): item is File => item instanceof File);
    const fileEntries = Object.fromEntries(
      [...formData.entries()]
        .filter(([key, value]) => key.startsWith("file_") && value instanceof File)
        .map(([key, value]) => [key.slice("file_".length), value as File]),
    );
    const fallbackNewFiles = sanitizeImageFiles(allUploadedFiles);

    let fallbackIndex = 0;
    const nextUrls: string[] = [];

    for (const item of orderedItems) {
      if (item.startsWith("existing:")) {
        const url = item.slice("existing:".length).trim();
        if (!url || !existingUrls.has(url)) {
          continue;
        }
        nextUrls.push(url);
        continue;
      }

      if (!item.startsWith("new:")) {
        continue;
      }

      const imageId = item.slice("new:".length).trim();
      const namedFile = fileEntries[imageId];
      const fallbackFile = fallbackNewFiles[fallbackIndex];
      const chosenFile = namedFile || fallbackFile;
      if (!namedFile && fallbackFile) {
        fallbackIndex += 1;
      }
      if (!chosenFile) {
        throw new Error(`Missing upload file for ${item}`);
      }

      if (!SUPPORTED_IMAGE_EXTS.has(path.extname(chosenFile.name).toLowerCase())) {
        continue;
      }

      const publicUrl = await uploadNewImage(supabase, carId, chosenFile);
      nextUrls.push(publicUrl);
    }

    const normalizedUrls = uniqueStrings(nextUrls.filter(Boolean));
    await replaceCarImages(supabase, carId, normalizedUrls, existingRows);

    return NextResponse.json({
      done: true,
      car_id: carId,
      image_count: normalizedUrls.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: message,
        hint: "Verify public.car_images schema, storage bucket permissions, and retry with the same image order.",
      },
      { status: 500 },
    );
  }
}
