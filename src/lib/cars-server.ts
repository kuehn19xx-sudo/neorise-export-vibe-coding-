import { carsData, getActiveCars, getCarById, type CarRecord } from "@/data/cars";
import { supabaseServer } from "@/lib/supabaseServer";

type MaybeCarRow = Record<string, unknown>;
const UUID_V4_OR_V1_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_IMAGE_FALLBACK = "/placeholder-car.jpg";
const SUPABASE_RETRY_DELAYS_MS = [250, 700];

function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toNumberValue(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) return Number(value);
  return fallback;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function resolveImageUrl(raw: string | null | undefined): string {
  const value = String(raw ?? "").trim();
  if (!value) return DEFAULT_IMAGE_FALLBACK;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return value;

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return value;
  return `${baseUrl}/storage/v1/object/public/car-images/${value.replace(/^\/+/, "")}`;
}

function toSpecs(value: unknown): Record<string, string> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, val]) => [key, String(val)]);
    return Object.fromEntries(entries);
  }
  return {};
}

function normalizeFuel(value: unknown): CarRecord["fuel"] {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "diesel") return "Diesel";
  if (raw === "hybrid") return "Hybrid";
  if (raw === "ev" || raw === "electric") return "EV";
  return "Petrol";
}

function normalizeTransmission(value: unknown): CarRecord["transmission"] {
  const raw = String(value ?? "").toLowerCase();
  return raw === "manual" ? "Manual" : "Automatic";
}

function normalizeStatus(value: unknown): CarRecord["status"] {
  const raw = String(value ?? "").toLowerCase();
  if (raw === "hidden") return "hidden";
  if (raw === "sold") return "sold";
  if (raw === "published" || raw === "available" || raw === "active") return "active";
  return "active";
}

function normalizeCar(row: MaybeCarRow): CarRecord {
  const id =
    toStringValue(row.id) ||
    toStringValue(row.car_id) ||
    toStringValue(row.uuid) ||
    "unknown-id";

  const imageCandidates = [...toStringArray(row.images), ...toStringArray(row.image_urls), ...toStringArray(row.gallery_urls)].map(
    (img) => resolveImageUrl(img),
  );

  const cover =
    toStringValue(row.cover_image_url) ||
    toStringValue(row.cover_image) ||
    toStringValue(row.image_url) ||
    toStringValue(row.image);

  const mergedImages = imageCandidates.length > 0 ? imageCandidates : cover ? [resolveImageUrl(cover)] : [DEFAULT_IMAGE_FALLBACK];
  const specsFromRow = toSpecs(row.specs);
  const specsFromJson = toSpecs(row.specs_json);
  const specs =
    Object.keys(specsFromRow).length > 0
      ? specsFromRow
      : Object.keys(specsFromJson).length > 0
        ? specsFromJson
        : ({ Drive: toStringValue(row.drive, "FWD") } as Record<string, string>);

  return {
    id,
    title:
      toStringValue(row.title) ||
      [toStringValue(row.brand), toStringValue(row.model)].filter(Boolean).join(" ") ||
      toStringValue(row.name) ||
      toStringValue(row.model) ||
      "Untitled Car",
    price: toNumberValue(row.price, 0),
    currency: "USD",
    year: toNumberValue(row.year, 0),
    mileage: toNumberValue(row.mileage, toNumberValue(row.mileage_km, 0)),
    fuel: normalizeFuel(row.fuel ?? row.fuel_type),
    transmission: normalizeTransmission(row.transmission),
    status: normalizeStatus(row.status),
    location: toStringValue(row.location, toStringValue(row.country, "China")),
    videoUrl: toStringValue(row.videoUrl) || toStringValue(row.video_url) || undefined,
    images: mergedImages,
    specs: {
      ...specs,
      Drive: toStringValue(row.drive, toStringValue(row.drive_type, specs.Drive ?? "FWD")),
      Engine: toStringValue(row.engine_size, specs.Engine ?? ""),
      Color: toStringValue(row.exterior_color, specs.Color ?? ""),
    },
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientSupabaseError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("522") ||
    lower.includes("connection timed out") ||
    lower.includes("cloudflare") ||
    lower.includes("<!doctype html>")
  );
}

async function loadImagesByCarId(carIds: string[]): Promise<Map<string, string[]>> {
  const imageMap = new Map<string, string[]>();
  if (carIds.length === 0) return imageMap;

  const { data, error } = await supabaseServer
    .from("car_images")
    .select("car_id,image_url,sort_order")
    .in("car_id", carIds)
    .order("sort_order", { ascending: true });

  if (error || !data) {
    return imageMap;
  }

  for (const row of data as Array<{ car_id: string; image_url: string | null }>) {
    if (!row?.car_id || !row?.image_url) continue;
    const current = imageMap.get(row.car_id) ?? [];
    current.push(resolveImageUrl(row.image_url));
    imageMap.set(row.car_id, current);
  }

  return imageMap;
}

export async function getActiveCarsServer(): Promise<CarRecord[]> {
  let data: unknown[] | null = null;
  let error: { message: string } | null = null;
  for (let attempt = 0; attempt <= SUPABASE_RETRY_DELAYS_MS.length; attempt += 1) {
    const query = await supabaseServer
      .from("cars")
      .select("*")
      .in("status", ["active", "published", "available"]);
    data = (query.data as unknown[] | null) ?? null;
    error = query.error ? { message: query.error.message } : null;
    if (!error) break;
    if (!isTransientSupabaseError(error.message) || attempt === SUPABASE_RETRY_DELAYS_MS.length) break;
    await sleep(SUPABASE_RETRY_DELAYS_MS[attempt]);
  }

  if (error) {
    console.error("[cars-server] supabase cars query failed, fallback to local carsData:", error.message);
    return getActiveCars();
  }

  if (!data || data.length === 0) {
    const fallbackQuery = await supabaseServer.from("cars").select("*");
    data = (fallbackQuery.data as unknown[] | null) ?? [];
    error = fallbackQuery.error ? { message: fallbackQuery.error.message } : null;
    if (error) {
      console.error("[cars-server] fallback cars query failed, fallback to local carsData:", error.message);
      return getActiveCars();
    }
  }

  if (!data || data.length === 0) {
    return getActiveCars();
  }

  const cars = data.map((row) => normalizeCar(row as MaybeCarRow));
  const imageMap = await loadImagesByCarId(cars.map((car) => car.id));
  const carsWithImages = cars.map((car) => ({
    ...car,
    images: imageMap.get(car.id)?.length ? imageMap.get(car.id)! : car.images,
  }));
  return carsWithImages.filter((car) => car.status === "active");
}

export async function getCarByIdServer(id: string): Promise<CarRecord | undefined> {
  const isUuid = UUID_V4_OR_V1_REGEX.test(id);

  if (!isUuid) {
    // Local demo ids like "NR-1001" are not valid UUIDs for Supabase "id" columns.
    return getCarById(id);
  }

  let data: MaybeCarRow | null = null;
  let error: { message: string } | null = null;
  for (let attempt = 0; attempt <= SUPABASE_RETRY_DELAYS_MS.length; attempt += 1) {
    const query = await supabaseServer.from("cars").select("*").eq("id", id).maybeSingle();
    data = (query.data as MaybeCarRow | null) ?? null;
    error = query.error ? { message: query.error.message } : null;
    if (!error) break;
    if (!isTransientSupabaseError(error.message) || attempt === SUPABASE_RETRY_DELAYS_MS.length) break;
    await sleep(SUPABASE_RETRY_DELAYS_MS[attempt]);
  }

  if (error) {
    console.error("[cars-server] supabase car detail query failed, fallback to local carsData:", error.message);
    return getCarById(id);
  }

  if (!data) {
    return carsData.find((car) => car.id === id);
  }

  const car = normalizeCar(data as MaybeCarRow);
  const imageMap = await loadImagesByCarId([car.id]);
  const images = imageMap.get(car.id);
  return {
    ...car,
    images: images && images.length > 0 ? images : car.images,
  };
}
