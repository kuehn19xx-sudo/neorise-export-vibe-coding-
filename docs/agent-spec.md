# Agent Spec

## Scope
- Project: `C:\Users\kk\neorise-export`
- Goal: Admin uploads images + text/voice, system auto-ingests to `public.cars` and `public.car_images`, frontend renders active inventory.

## Core Flow
1. Admin opens `/admin/upload` and submits `car_text` + image files.
2. `POST /api/ingest-car` validates admin token, parses text, and upserts car record by `stock_no` idempotency.
3. Images are uploaded to Supabase Storage bucket (default `car-images`) with `upsert: true`.
4. API inserts non-duplicate image URLs into `public.car_images`.
5. Frontend data loaders read `public.cars` + `public.car_images` and render active cars only.
6. Admin can open `/admin/cars` to edit car fields, save changes, and save-and-down-shelf (`status = hidden`).

## Security Rules
- Admin import uses server-side env vars only:
  - `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ADMIN_INGEST_TOKEN`
- Client must never receive service keys.
- No admin entry on customer pages (`/[lang]/**`).

## Field Mapping (car_text -> public.cars)
- `title` / `标题` / `车型标题` -> `title`
- `price` / `价格` -> `price` (numeric)
- `year` / `年份` -> `year` (numeric)
- `mileage` / `里程` -> `mileage` (numeric)
- `engine` / `发动机` -> `engine`
- `trans` / `transmission` / `变速箱` -> `trans`
- `fuel` / `fuel_type` / `燃油` -> `fuel`
- `status` / `状态` -> `status`
- `stock_no` / `stock` / `库存号` -> `stock_no`
- Optional:
  - `brand` / `品牌` -> `brand`
  - `model` / `型号` -> `model`

## Required Fields
- `title`, `price`, `year`, `mileage`, `engine`, `trans`, `fuel`, `status`, `stock_no`

## Idempotency
- Car insert:
  - If unique conflict on `stock_no`, importer reads existing row and reuses it.
- Image insert:
  - API compares existing `image_url` values per `car_id` and inserts only missing ones.
- Storage upload:
  - Uses deterministic path and `upsert: true`.

## Image Ordering
- `car_images.sort_order` follows the upload order from admin form.
- The first uploaded image gets the smallest `sort_order` and is treated as primary image in frontend cards.

## Task Logging (DB)
- API writes ingest status to `public.ingest_tasks` by default.
- Table name can be changed with `SUPABASE_INGEST_TASKS_TABLE`.
- Expected columns (best effort; missing columns are auto-dropped from payload):
  - `id` (primary key)
  - `status` (`running` | `success` | `failed`)
  - `retry_count` (integer)
  - `error_message` (text, nullable)
  - `car_id` (text/uuid, nullable)
  - `stock_no` (text, nullable)
- If the table is missing, import still runs and returns `logging_warning`.

## Error Contract
- API errors return:
  - `error`: technical reason
  - `hint`: actionable fix guidance
  - `task_id`: logging row id when available
  - `logging_warning`: why task log persistence is disabled

## Rollback
1. Revert code changes:
   - `src/app/api/ingest-car/route.ts`
   - `docs/agent-spec.md`
2. Optional DB rollback for task log feature:
   - Keep `public.ingest_tasks` table (safe), or remove only if explicitly approved.
