import crypto from "node:crypto";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const REQUIRED_FIELDS = ["title", "price", "year", "mileage", "engine", "trans", "fuel", "status", "stock_no"] as const;
const NUMERIC_FIELDS = new Set(["price", "year", "mileage"]);
const SUPPORTED_IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const KEY_ALIASES: Record<string, string> = {
  title: "title",
  标题: "title",
  车型标题: "title",
  price: "price",
  价格: "price",
  year: "year",
  年份: "year",
  mileage: "mileage",
  里程: "mileage",
  engine: "engine",
  发动机: "engine",
  trans: "trans",
  transmission: "trans",
  变速箱: "trans",
  fuel: "fuel",
  燃油: "fuel",
  fuel_type: "fuel",
  status: "status",
  状态: "status",
  stock_no: "stock_no",
  stock: "stock_no",
  库存号: "stock_no",
  brand: "brand",
  品牌: "brand",
  model: "model",
  型号: "model",
};

type CarInput = Record<string, string | number>;
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
type IngestTaskContext = {
  tableName: string;
  taskId: string | null;
  disabled: boolean;
  warning?: string;
};

function parseInteger(rawValue: string, key: string): number {
  const digits = String(rawValue).replace(/[^\d-]/g, "");
  if (!digits || digits === "-" || Number.isNaN(Number(digits))) {
    throw new Error(`Invalid numeric value for ${key}: ${rawValue}`);
  }
  return Number.parseInt(digits, 10);
}

function normalizeKey(key: string): string {
  return KEY_ALIASES[key.trim().toLowerCase()] ?? key.trim().toLowerCase();
}

function inferFromNarrative(content: string, result: CarInput) {
  const text = content.replace(/\s+/g, " ").trim();

  if (!result.price) {
    const m = text.match(/(?:price|价格)[^\d]*(\$?\s?[\d,]+)/i) ?? text.match(/(\$\s?[\d,]{3,})/);
    if (m?.[1]) result.price = m[1];
  }
  if (!result.year) {
    const m = text.match(/\b(19\d{2}|20\d{2}|21\d{2})\b/);
    if (m?.[1]) result.year = m[1];
  }
  if (!result.mileage) {
    const m = text.match(/(?:mileage|里程)[^\d]*(\d[\d,]*)/i) ?? text.match(/(\d[\d,]*)\s?(?:km|公里|mi|miles)\b/i);
    if (m?.[1]) result.mileage = m[1];
  }
  if (!result.trans) {
    const m = text.match(/\b(automatic|manual|cvt|at|mt|自动|手动)\b/i);
    if (m?.[1]) result.trans = m[1];
  }
  if (!result.fuel) {
    const m = text.match(/\b(gasoline|petrol|diesel|hybrid|electric|ev|汽油|柴油|混动|电动)\b/i);
    if (m?.[1]) result.fuel = m[1];
  }
  if (!result.engine) {
    const m = text.match(/\b(\d\.\dL?\s?[A-Za-z0-9+-]*)\b/) ?? text.match(/(?:engine|发动机)[:：]?\s*([^\s,，]+)/i);
    if (m?.[1]) result.engine = m[1];
  }
  if (!result.status) {
    const m = text.match(/\b(available|active|published|sold|hidden|在售|下架|售出)\b/i);
    if (m?.[1]) result.status = m[1];
  }
  if (!result.stock_no) {
    const m = text.match(/\b([A-Z]{1,4}-\d{3,8})\b/i);
    if (m?.[1]) result.stock_no = m[1].toUpperCase();
  }
}

function finalizeDefaults(result: CarInput): CarInput {
  const title = String(result.title ?? "").trim();
  const tokens = title.split(/\s+/).filter(Boolean);
  if (!result.brand) result.brand = tokens[0] ?? "Unknown";
  if (!result.model) result.model = tokens.slice(1, 3).join(" ") || title || "Unknown";
  if (!result.status) result.status = "available";
  if (!result.stock_no) {
    result.stock_no = `AUTO-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${crypto
      .randomBytes(2)
      .toString("hex")
      .toUpperCase()}`;
  }
  return result;
}

function parseCarText(content: string): CarInput {
  const result: CarInput = {};
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const sepIndex = line.search(/[:：]/);
    if (sepIndex < 0) continue;

    const key = normalizeKey(line.slice(0, sepIndex).trim().replace(/^\uFEFF/, ""));
    const value = line.slice(sepIndex + 1).trim();

    if (!key || !value) continue;
    result[key] = value;
  }

  inferFromNarrative(content, result);
  finalizeDefaults(result);

  if (!result.title) {
    if (result.brand && result.model) result.title = `${result.brand} ${result.model}`;
    else throw new Error("Missing required field in description: title");
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in result)) {
      throw new Error(`Missing required field in description: ${field}`);
    }
  }

  for (const field of NUMERIC_FIELDS) {
    result[field] = parseInteger(String(result[field]), field);
  }

  return result;
}

function sanitizeImageFiles(files: File[]): File[] {
  // Keep incoming order so the first uploaded image becomes the primary image.
  return files.filter((file) => SUPPORTED_IMAGE_EXTS.has(path.extname(file.name).toLowerCase()));
}

function buildSafeStorageFileName(originalName: string, index: number): string {
  const ext = path.extname(originalName).toLowerCase();
  const base = path.basename(originalName, ext);
  const normalizedBase = base
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const fallbackBase = normalizedBase || `image-${index + 1}`;
  const safeExt = SUPPORTED_IMAGE_EXTS.has(ext) ? ext : ".jpg";
  return `${Date.now()}-${index + 1}-${fallbackBase}${safeExt}`;
}

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

async function insertCarWithRetries(
  supabase: AdminClient,
  carData: CarInput,
  onRetry?: (retryCount: number) => Promise<void> | void,
) {
  const payload: Record<string, string | number> = {
    brand: String(carData.brand),
    model: String(carData.model),
    title: String(carData.title),
    price: Number(carData.price),
    year: Number(carData.year),
    mileage: Number(carData.mileage),
    engine: String(carData.engine),
    trans: String(carData.trans),
    fuel: String(carData.fuel),
    status: String(carData.status),
    stock_no: String(carData.stock_no),
  };

  for (let i = 0; i < 8; i += 1) {
    if (i > 0 && onRetry) {
      await onRetry(i);
    }
    const { data, error } = await supabase.from("cars").insert(payload).select("*").single();
    if (!error) return data as Record<string, unknown>;

    const missingColumn = error.message.match(/Could not find the '([^']+)' column/);
    if (missingColumn?.[1] && missingColumn[1] in payload) {
      delete payload[missingColumn[1]];
      continue;
    }

    if (error.message.includes("duplicate key value") && error.message.includes("stock_no")) {
      const { data: existed, error: existedError } = await supabase
        .from("cars")
        .select("*")
        .eq("stock_no", String(carData.stock_no))
        .maybeSingle();
      if (!existedError && existed) return existed as Record<string, unknown>;
    }

    throw new Error(`Failed to insert into public.cars: ${error.message}`);
  }

  throw new Error("Failed to insert into public.cars: too many retries");
}

function getIngestTasksTableName(): string {
  return process.env.SUPABASE_INGEST_TASKS_TABLE || "ingest_tasks";
}

function parseMissingColumnName(errorMessage: string): string | null {
  const missingColumn = errorMessage.match(/Could not find the '([^']+)' column/);
  return missingColumn?.[1] ?? null;
}

async function insertWithColumnFallback(
  supabase: AdminClient,
  tableName: string,
  payload: Record<string, string | number | null>,
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  const mutablePayload = { ...payload };

  for (let i = 0; i < 8; i += 1) {
    const { data, error } = await supabase.from(tableName).insert(mutablePayload).select("*").single();
    if (!error) return { data: (data ?? null) as Record<string, unknown> | null, error: null };

    const missingColumn = parseMissingColumnName(error.message);
    if (missingColumn && missingColumn in mutablePayload) {
      delete mutablePayload[missingColumn];
      continue;
    }
    return { data: null, error: error.message };
  }

  return { data: null, error: `Failed to insert into public.${tableName}: too many retries` };
}

async function updateWithColumnFallback(
  supabase: AdminClient,
  tableName: string,
  taskId: string,
  payload: Record<string, string | number | null>,
): Promise<string | null> {
  const mutablePayload = { ...payload };

  for (let i = 0; i < 8; i += 1) {
    const { error } = await supabase.from(tableName).update(mutablePayload).eq("id", taskId);
    if (!error) return null;

    const missingColumn = parseMissingColumnName(error.message);
    if (missingColumn && missingColumn in mutablePayload) {
      delete mutablePayload[missingColumn];
      continue;
    }
    return error.message;
  }

  return `Failed to update public.${tableName}: too many retries`;
}

function toShortMessage(error: unknown): string {
  if (error instanceof Error) return error.message.slice(0, 500);
  return String(error).slice(0, 500);
}

function getErrorHint(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("unauthorized")) {
    return "Check ADMIN_INGEST_TOKEN in server env and make sure request header x-admin-token matches.";
  }
  if (lower.includes("missing required field")) {
    return "Add all required fields in car_text: title, price, year, mileage, engine, trans, fuel, status, stock_no.";
  }
  if (lower.includes("invalid numeric value")) {
    return "Use numeric values for price, year and mileage. Currency symbols are allowed but number must be present.";
  }
  if (lower.includes("supabase_url") || lower.includes("service_role")) {
    return "Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY on server.";
  }
  if (lower.includes("failed to upload")) {
    return "Check storage bucket permissions and ensure SUPABASE_BUCKET_CAR_IMAGES exists.";
  }
  if (lower.includes("failed to insert into public.car_images")) {
    return "Verify public.car_images columns include car_id, image_url and sort_order.";
  }
  if (lower.includes("failed to insert into public.cars")) {
    return "Verify public.cars schema and uniqueness of stock_no; fix conflicting data then retry.";
  }
  return "Review server logs and verify DB schema/env vars, then retry with the same stock_no for idempotent import.";
}

async function beginIngestTask(supabase: AdminClient): Promise<IngestTaskContext> {
  const tableName = getIngestTasksTableName();
  const payload = {
    status: "running",
    retry_count: 0,
    error_message: null,
  };

  const { data, error } = await insertWithColumnFallback(supabase, tableName, payload);
  if (!error) {
    const taskId = String(data?.id ?? "");
    if (taskId) {
      return { tableName, taskId, disabled: false };
    }
  }

  const reason = String(error ?? "");
  if (reason.includes(`relation "${tableName}" does not exist`)) {
    return {
      tableName,
      taskId: null,
      disabled: true,
      warning: `Task logging disabled because table public.${tableName} does not exist`,
    };
  }

  return {
    tableName,
    taskId: null,
    disabled: true,
    warning: `Task logging disabled: ${reason || "unknown logging error"}`,
  };
}

async function patchIngestTask(
  supabase: AdminClient,
  task: IngestTaskContext,
  payload: Record<string, string | number | null>,
): Promise<string | null> {
  if (task.disabled || !task.taskId) return null;
  return updateWithColumnFallback(supabase, task.tableName, task.taskId, payload);
}

export async function POST(request: Request) {
  let supabase: AdminClient | null = null;
  let taskContext: IngestTaskContext | null = null;
  let retryCount = 0;

  try {
    const requiredAdminToken = process.env.ADMIN_INGEST_TOKEN;
    if (requiredAdminToken) {
      const cookieHeader = request.headers.get("cookie") ?? "";
      const cookieToken =
        cookieHeader
          .split(";")
          .map((chunk) => chunk.trim())
          .find((chunk) => chunk.startsWith("admin_token="))
          ?.slice("admin_token=".length) ?? "";
      const providedToken = request.headers.get("x-admin-token")?.trim() || cookieToken.trim();
      if (providedToken !== requiredAdminToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const formData = await request.formData();
    const carText = String(formData.get("car_text") ?? "");
    if (!carText.trim()) {
      return NextResponse.json({ error: "car_text is required" }, { status: 400 });
    }

    const uploadedFiles = formData.getAll("images").filter((item): item is File => item instanceof File);
    const imageFiles = sanitizeImageFiles(uploadedFiles);

    supabase = getAdminClient();
    taskContext = await beginIngestTask(supabase);
    const carData = parseCarText(carText);
    const createdCar = await insertCarWithRetries(supabase, carData, async (count) => {
      retryCount = count;
      await patchIngestTask(supabase!, taskContext!, { retry_count: retryCount });
    });
    const carId = String(createdCar.car_id ?? createdCar.id ?? "");
    if (!carId) {
      throw new Error("Insert succeeded but no car_id/id was returned from public.cars");
    }

    const bucket = process.env.SUPABASE_BUCKET_CAR_IMAGES || "car-images";
    const prefix = process.env.SUPABASE_CAR_IMAGES_PREFIX || "car";
    const uploadedRows: Array<{ image_url: string }> = [];

    for (let index = 0; index < imageFiles.length; index += 1) {
      const file = imageFiles[index];
      const safeFileName = buildSafeStorageFileName(file.name, index);
      const storagePath = `${prefix}/${carId}/${safeFileName}`;
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
      uploadedRows.push({ image_url: publicData.publicUrl });
    }

    let insertedRows = 0;
    if (uploadedRows.length > 0) {
      const { data: existingRows, error: existingError } = await supabase
        .from("car_images")
        .select("image_url,sort_order")
        .eq("car_id", carId);
      if (existingError) {
        throw new Error(`Failed to read existing public.car_images: ${existingError.message}`);
      }

      const existingUrls = new Set((existingRows ?? []).map((row) => String(row.image_url)));
      const nextSortOrder = (existingRows ?? []).reduce((max, row) => Math.max(max, Number(row.sort_order ?? -1)), -1) + 1;

      const rowsToInsert = uploadedRows
        .filter((row) => !existingUrls.has(row.image_url))
        .map((row, index) => ({
          car_id: carId,
          image_url: row.image_url,
          sort_order: nextSortOrder + index,
        }));

      if (rowsToInsert.length > 0) {
        const { error: insertError } = await supabase.from("car_images").insert(rowsToInsert);
        if (insertError) {
          throw new Error(`Failed to insert into public.car_images: ${insertError.message}`);
        }
        insertedRows = rowsToInsert.length;
      }
    }

    const taskUpdateError = await patchIngestTask(supabase, taskContext, {
      status: "success",
      retry_count: retryCount,
      error_message: null,
      car_id: carId,
      stock_no: String(carData.stock_no ?? ""),
    });

    return NextResponse.json({
      car_id: carId,
      inserted_car_images: insertedRows,
      uploaded_image_files: imageFiles.length,
      task_id: taskContext?.taskId ?? null,
      logging_warning: taskContext?.warning ?? taskUpdateError ?? null,
      done: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const hint = getErrorHint(message);

    if (supabase && taskContext) {
      await patchIngestTask(supabase, taskContext, {
        status: "failed",
        retry_count: retryCount,
        error_message: toShortMessage(error),
      });
    }

    return NextResponse.json(
      {
        error: message,
        hint,
        task_id: taskContext?.taskId ?? null,
        logging_warning: taskContext?.warning ?? null,
      },
      { status: 500 },
    );
  }
}
