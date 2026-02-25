import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type CarRow = Record<string, unknown>;
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
type LooseSupabaseClient = ReturnType<typeof createClient<LooseSupabaseDatabase>>;

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

  const providedToken = request.headers.get("x-admin-token")?.trim() || "";
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

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeCar(row: CarRow) {
  const id = toStringValue(row.id) || toStringValue(row.car_id) || toStringValue(row.uuid);
  const brand = toStringValue(row.brand);
  const model = toStringValue(row.model);
  const title =
    toStringValue(row.title) ||
    [brand, model].filter(Boolean).join(" ") ||
    toStringValue(row.name) ||
    "Untitled Car";
  const status = toStringValue(row.status) || "unknown";
  const stockNo = toStringValue(row.stock_no) || "-";
  const createdAt = toStringValue(row.created_at) || toStringValue(row.inserted_at) || "";
  const price = row.price;
  const year = row.year;
  const mileage = row.mileage;
  const engine = toStringValue(row.engine);
  const trans = toStringValue(row.trans) || toStringValue(row.transmission);
  const fuel = toStringValue(row.fuel) || toStringValue(row.fuel_type);

  return {
    id,
    title,
    status,
    stock_no: stockNo,
    created_at: createdAt,
    brand,
    model,
    price: typeof price === "number" ? price : Number(price ?? 0),
    year: typeof year === "number" ? year : Number(year ?? 0),
    mileage: typeof mileage === "number" ? mileage : Number(mileage ?? 0),
    engine,
    trans,
    fuel,
  };
}

function sortCarsByCreatedAtDesc(cars: Array<ReturnType<typeof normalizeCar>>) {
  return cars.sort((a, b) => {
    const t1 = Date.parse(a.created_at || "");
    const t2 = Date.parse(b.created_at || "");
    if (Number.isNaN(t1) && Number.isNaN(t2)) return 0;
    if (Number.isNaN(t1)) return 1;
    if (Number.isNaN(t2)) return -1;
    return t2 - t1;
  });
}

export async function GET(request: Request) {
  const authError = requireAdminToken(request);
  if (authError) return authError;

  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase.from("cars").select("*").limit(200);
    if (error) {
      throw new Error(`Failed to read public.cars: ${error.message}`);
    }

    const rows = (data ?? []) as CarRow[];
    const cars = sortCarsByCreatedAtDesc(rows.map((row) => normalizeCar(row)).filter((car) => car.id));
    return NextResponse.json({ cars });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: message,
        hint: "Verify public.cars table exists and service role key has read permission.",
      },
      { status: 500 },
    );
  }
}

function isNoMatchError(message: string) {
  const lower = message.toLowerCase();
  return lower.includes("0 rows") || lower.includes("no rows");
}

async function updateStatusById(
  supabase: LooseSupabaseClient,
  column: "id" | "car_id",
  carId: string,
  status: "hidden",
) {
  const { data, error } = await supabase.from("cars").update({ status }).eq(column, carId).select("*").maybeSingle();
  if (!error && data) return { data: data as CarRow, error: null };
  return { data: null, error: error?.message ?? "Car not found" };
}

const ALLOWED_UPDATE_KEYS = new Set([
  "brand",
  "model",
  "title",
  "price",
  "year",
  "mileage",
  "engine",
  "trans",
  "fuel",
  "status",
  "stock_no",
]);
const NUMERIC_UPDATE_KEYS = new Set(["price", "year", "mileage"]);

function sanitizeCarUpdates(input: Record<string, unknown>): Record<string, string | number> {
  const updates: Record<string, string | number> = {};

  for (const [key, rawValue] of Object.entries(input)) {
    if (!ALLOWED_UPDATE_KEYS.has(key)) continue;

    if (NUMERIC_UPDATE_KEYS.has(key)) {
      if (rawValue === null || rawValue === undefined || rawValue === "") continue;
      const numberValue = Number(rawValue);
      if (!Number.isFinite(numberValue)) {
        throw new Error(`Invalid numeric value for ${key}`);
      }
      updates[key] = Math.trunc(numberValue);
      continue;
    }

    if (typeof rawValue !== "string") continue;
    const value = rawValue.trim();
    if (!value) continue;
    updates[key] = value;
  }

  return updates;
}

async function updateCarById(
  supabase: LooseSupabaseClient,
  column: "id" | "car_id",
  carId: string,
  updates: Record<string, string | number>,
) {
  const { data, error } = await supabase.from("cars").update(updates).eq(column, carId).select("*").maybeSingle();
  if (!error && data) return { data: data as CarRow, error: null };
  return { data: null, error: error?.message ?? "Car not found" };
}

export async function PATCH(request: Request) {
  const authError = requireAdminToken(request);
  if (authError) return authError;

  try {
    const payload = (await request.json()) as { car_id?: string; action?: string; updates?: Record<string, unknown> };
    const carId = String(payload?.car_id ?? "").trim();
    if (!carId) {
      return NextResponse.json(
        { error: "car_id is required", hint: "Provide a valid car_id from admin cars list." },
        { status: 400 },
      );
    }
    const action = String(payload?.action ?? "update").trim().toLowerCase();
    if (action !== "down_shelf" && action !== "update") {
      return NextResponse.json(
        { error: "Invalid action", hint: "Use action=update or action=down_shelf." },
        { status: 400 },
      );
    }

    const supabase = getAdminClient();
    if (action === "update") {
      const updates = sanitizeCarUpdates(payload?.updates ?? {});
      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { error: "No editable fields provided", hint: "Provide updates with at least one editable field." },
          { status: 400 },
        );
      }

      let result = await updateCarById(supabase, "id", carId, updates);
      if (result.error && isNoMatchError(result.error)) {
        result = await updateCarById(supabase, "car_id", carId, updates);
      }
      if (result.error || !result.data) {
        throw new Error(`Failed to update car: ${result.error ?? "car not found"}`);
      }

      return NextResponse.json({
        car: normalizeCar(result.data),
        action,
        done: true,
      });
    }

    let result = await updateStatusById(supabase, "id", carId, "hidden");
    if (result.error && isNoMatchError(result.error)) {
      result = await updateStatusById(supabase, "car_id", carId, "hidden");
    }
    if (result.error || !result.data) {
      throw new Error(`Failed to update car status: ${result.error ?? "car not found"}`);
    }

    return NextResponse.json({
      car: normalizeCar(result.data),
      action,
      done: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: message,
        hint: "Verify the car exists in public.cars and editable columns/status values are valid.",
      },
      { status: 500 },
    );
  }
}
