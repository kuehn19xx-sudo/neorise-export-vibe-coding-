"use client";

import {
  DndContext,
  type DragEndEvent,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useRef, useState } from "react";

type CarListItem = {
  id: string;
  title: string;
  status: string;
  stock_no: string;
  created_at: string;
  brand: string;
  model: string;
  price: number;
  year: number;
  mileage: number;
  engine: string;
  trans: string;
  fuel: string;
  specs_json?: Record<string, string>;
};

type ManagedImage = {
  id: string;
  source: "existing" | "new";
  url: string;
  file?: File;
  previewUrl?: string;
};

type ApiErrorPayload = {
  error?: string;
  hint?: string;
};

const detailRows: Array<{ leftLabel: string; leftKey: string; rightLabel: string; rightKey: string }> = [
  { leftLabel: "Reference No.", leftKey: "ref_no", rightLabel: "Steering", rightKey: "steering" },
  { leftLabel: "Model Code", leftKey: "model_code", rightLabel: "Body Type", rightKey: "body_type" },
  { leftLabel: "Model Year", leftKey: "model_year", rightLabel: "Mileage (km)", rightKey: "fuel_mileage_km" },
  { leftLabel: "Exterior Color", leftKey: "exterior_color", rightLabel: "Fuel", rightKey: "fuel_type_label" },
  { leftLabel: "Engine", leftKey: "engine_label", rightLabel: "Transmission", rightKey: "transmission_label" },
  { leftLabel: "Drive System", leftKey: "drive_system", rightLabel: "Battery (kWh)", rightKey: "battery_kwh" },
  { leftLabel: "Range (km)", leftKey: "range_km", rightLabel: "Motor Power (kW)", rightKey: "motor_kw" },
  { leftLabel: "Seats", leftKey: "seats", rightLabel: "Doors", rightKey: "doors" },
  { leftLabel: "Dimensions (mm)", leftKey: "dimensions_mm", rightLabel: "Volume (m3)", rightKey: "cubic_meters" },
  { leftLabel: "Weight (kg)", leftKey: "weight_kg", rightLabel: "Max Load (kg)", rightKey: "max_load_kg" },
];

type SortableManagedImageCardProps = {
  item: ManagedImage;
  index: number;
  total: number;
  onRemove: (id: string) => void;
  onMoveStep: (index: number, direction: "left" | "right") => void;
};

function SortableManagedImageCard({ item, index, total, onRemove, onMoveStep }: SortableManagedImageCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "z-20 opacity-70" : ""}>
      <div className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white text-left">
        <button type="button" className="block w-full text-left cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.url} alt="Car image" className="h-24 w-full object-cover transition group-hover:scale-105" />
        </button>

        <button
          type="button"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove(item.id);
          }}
          className="absolute right-1 top-1 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-white shadow-sm"
          aria-label="Remove image"
        >
          <span className="h-[2px] w-2.5 rounded bg-white" />
        </button>

        <div className="flex items-center justify-center gap-1 px-2 py-2">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onMoveStep(index, "left");
            }}
            disabled={index === 0}
            className={`inline-flex h-5 w-5 items-center justify-center rounded border text-[10px] ${
              index === 0 ? "cursor-not-allowed border-slate-200 text-slate-300" : "border-slate-300 text-slate-700"
            }`}
          >
            {"<"}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onMoveStep(index, "right");
            }}
            disabled={index === total - 1}
            className={`inline-flex h-5 w-5 items-center justify-center rounded border text-[10px] ${
              index === total - 1 ? "cursor-not-allowed border-slate-200 text-slate-300" : "border-slate-300 text-slate-700"
            }`}
          >
            {">"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminCarList() {
  const [adminToken, setAdminToken] = useState("");
  const [cars, setCars] = useState<CarListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [workingCarId, setWorkingCarId] = useState<string | null>(null);
  const [editingCarId, setEditingCarId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    brand: "",
    model: "",
    title: "",
    price: "",
    year: "",
    mileage: "",
    engine: "",
    trans: "",
    fuel: "",
    stock_no: "",
    status: "active",
  });
  const [detailForm, setDetailForm] = useState<Record<string, string>>({});

  const [imageManagerCarId, setImageManagerCarId] = useState<string | null>(null);
  const [imageManagerCarTitle, setImageManagerCarTitle] = useState<string>("");
  const [imageManagerItems, setImageManagerItems] = useState<ManagedImage[]>([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageSaving, setImageSaving] = useState(false);
  const [imageError, setImageError] = useState("");
  const [imageMessage, setImageMessage] = useState("");
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);

  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 6,
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const canLoad = useMemo(() => !loading, [loading]);

  function authHeaders(contentTypeJson = false): HeadersInit {
    if (contentTypeJson) {
      return {
        "content-type": "application/json",
        ...(adminToken.trim() ? { "x-admin-token": adminToken.trim() } : {}),
      };
    }
    return adminToken.trim() ? { "x-admin-token": adminToken.trim() } : {};
  }

  function revokeNewPreviews(items: ManagedImage[]) {
    for (const item of items) {
      if (item.source === "new" && item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    }
  }

  async function loadCars() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/cars", {
        method: "GET",
        headers: authHeaders(false),
      });
      const payload = (await response.json()) as { cars?: CarListItem[] } & ApiErrorPayload;
      if (!response.ok) {
        throw new Error([payload.error, payload.hint].filter(Boolean).join(" | ") || "Failed to load cars");
      }

      setCars(payload.cars ?? []);
      setMessage(`Loaded ${payload.cars?.length ?? 0} cars.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadCarImages(carId: string) {
    setImageLoading(true);
    setImageError("");
    setImageMessage("");
    try {
      const response = await fetch(`/api/admin/car-images?car_id=${encodeURIComponent(carId)}`, {
        method: "GET",
        headers: authHeaders(false),
      });
      const payload = (await response.json()) as { images?: Array<{ image_url: string }> } & ApiErrorPayload;
      if (!response.ok) {
        throw new Error([payload.error, payload.hint].filter(Boolean).join(" | ") || "Failed to load images");
      }

      setImageManagerItems((prev) => {
        revokeNewPreviews(prev);
        return (payload.images ?? []).map((row, index) => ({
          id: `existing-${index}-${row.image_url}`,
          source: "existing" as const,
          url: row.image_url,
        }));
      });
    } catch (e) {
      setImageError(e instanceof Error ? e.message : String(e));
    } finally {
      setImageLoading(false);
    }
  }

  async function openImageManager(car: CarListItem) {
    setImageManagerCarId(car.id);
    setImageManagerCarTitle(car.title);
    await loadCarImages(car.id);
  }

  function closeImageManager() {
    setImageManagerCarId(null);
    setImageManagerCarTitle("");
    setImageError("");
    setImageMessage("");
    setImageManagerItems((prev) => {
      revokeNewPreviews(prev);
      return [];
    });
    if (imageFileInputRef.current) imageFileInputRef.current.value = "";
  }

  function appendImageFiles(files: File[]) {
    if (files.length === 0) return;
    const newItems: ManagedImage[] = files.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      return {
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`,
        source: "new",
        url: previewUrl,
        previewUrl,
        file,
      };
    });
    setImageManagerItems((prev) => [...prev, ...newItems]);
    if (imageFileInputRef.current) imageFileInputRef.current.value = "";
  }

  function removeManagedImage(id: string) {
    setImageManagerItems((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target?.source === "new" && target.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  }

  function moveManagedImageStep(index: number, direction: "left" | "right") {
    const target = direction === "left" ? index - 1 : index + 1;
    if (target < 0 || target >= imageManagerItems.length) return;
    setImageManagerItems((prev) => arrayMove(prev, index, target));
  }

  function onManagedImageDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setImageManagerItems((prev) => {
      const from = prev.findIndex((item) => item.id === active.id);
      const to = prev.findIndex((item) => item.id === over.id);
      if (from < 0 || to < 0) return prev;
      return arrayMove(prev, from, to);
    });
  }

  async function saveManagedImages() {
    if (!imageManagerCarId) return;
    setImageSaving(true);
    setImageError("");
    setImageMessage("");
    try {
      const orderedItems: string[] = [];
      const formData = new FormData();
      formData.append("car_id", imageManagerCarId);

      for (const item of imageManagerItems) {
        if (item.source === "existing") {
          orderedItems.push(`existing:${item.url}`);
          continue;
        }
        orderedItems.push(`new:${item.id}`);
        if (item.file) formData.append(`file_${item.id}`, item.file);
      }

      formData.append("ordered_items", JSON.stringify(orderedItems));

      const response = await fetch("/api/admin/car-images", {
        method: "POST",
        headers: authHeaders(false),
        body: formData,
      });
      const payload = (await response.json()) as { image_count?: number } & ApiErrorPayload;
      if (!response.ok) {
        throw new Error([payload.error, payload.hint].filter(Boolean).join(" | ") || "Failed to save images");
      }

      setImageMessage(`Saved ${payload.image_count ?? 0} images.`);
      await loadCarImages(imageManagerCarId);
    } catch (e) {
      setImageError(e instanceof Error ? e.message : String(e));
    } finally {
      setImageSaving(false);
    }
  }

  function openEditor(car: CarListItem) {
    setEditingCarId(car.id);
    setEditForm({
      brand: car.brand ?? "",
      model: car.model ?? "",
      title: car.title ?? "",
      price: String(car.price ?? 0),
      year: String(car.year ?? 0),
      mileage: String(car.mileage ?? 0),
      engine: car.engine ?? "",
      trans: car.trans ?? "",
      fuel: car.fuel ?? "",
      stock_no: car.stock_no ?? "",
      status: car.status || "active",
    });
    setDetailForm(car.specs_json ?? {});
    setError("");
    setMessage("");
  }

  async function saveEdit(downShelfAfterSave: boolean) {
    if (!editingCarId) return;

    setWorkingCarId(editingCarId);
    setError("");
    setMessage("");

    try {
      const normalizedDetails = Object.fromEntries(
        Object.entries(detailForm)
          .map(([key, value]) => [key, value.trim()])
          .filter(([, value]) => value.length > 0),
      );

      const updates = {
        brand: editForm.brand.trim(),
        model: editForm.model.trim(),
        title: editForm.title.trim(),
        price: editForm.price.trim(),
        year: editForm.year.trim(),
        mileage: editForm.mileage.trim(),
        engine: editForm.engine.trim(),
        trans: editForm.trans.trim(),
        fuel: editForm.fuel.trim(),
        status: editForm.status,
        specs_json: normalizedDetails,
        ...(editForm.stock_no.trim() && editForm.stock_no.trim() !== "-" ? { stock_no: editForm.stock_no.trim() } : {}),
      };

      const response = await fetch("/api/admin/cars", {
        method: "PATCH",
        headers: authHeaders(true),
        body: JSON.stringify({ car_id: editingCarId, action: "update", updates }),
      });
      const payload = (await response.json()) as { car?: CarListItem } & ApiErrorPayload;
      if (!response.ok) {
        throw new Error([payload.error, payload.hint].filter(Boolean).join(" | ") || "Failed to update car");
      }

      let updatedCar = payload.car;
      if (downShelfAfterSave) {
        const downShelfResponse = await fetch("/api/admin/cars", {
          method: "PATCH",
          headers: authHeaders(true),
          body: JSON.stringify({ car_id: editingCarId, action: "down_shelf" }),
        });
        const downShelfPayload = (await downShelfResponse.json()) as { car?: CarListItem } & ApiErrorPayload;
        if (!downShelfResponse.ok) {
          throw new Error([downShelfPayload.error, downShelfPayload.hint].filter(Boolean).join(" | ") || "Failed to down-shelf");
        }
        updatedCar = downShelfPayload.car ?? updatedCar;
      }

      if (updatedCar) {
        setCars((prev) => prev.map((car) => (car.id === editingCarId ? { ...car, ...updatedCar } : car)));
      }
      setMessage(downShelfAfterSave ? `Car ${editingCarId} saved and down-shelved.` : `Car ${editingCarId} updated.`);
      setEditingCarId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setWorkingCarId(null);
    }
  }

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Car List Management</h2>
      <p className="text-sm text-slate-600">Load cars and manage listings. Admin session cookie is used by default.</p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 space-y-2">
          <span className="text-sm font-medium text-slate-800">Admin Token (optional)</span>
          <input
            type="password"
            value={adminToken}
            onChange={(event) => setAdminToken(event.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#ff7a1a]"
            placeholder="Optional: use x-admin-token instead of cookie session"
          />
        </label>
        <button
          type="button"
          onClick={loadCars}
          disabled={!canLoad}
          className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Loading..." : "Load Cars"}
        </button>
      </div>

      {message ? <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">ID</th>
              <th className="px-3 py-2 font-medium">Title</th>
              <th className="px-3 py-2 font-medium">Stock No</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Created At</th>
              <th className="px-3 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {cars.map((car) => (
              <tr key={car.id} className="border-t border-slate-200">
                <td className="px-3 py-2 font-mono text-xs text-slate-700">{car.id}</td>
                <td className="px-3 py-2 text-slate-900">{car.title}</td>
                <td className="px-3 py-2 text-slate-700">{car.stock_no}</td>
                <td className="px-3 py-2 text-slate-700">{car.status}</td>
                <td className="px-3 py-2 text-slate-700">{car.created_at || "-"}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditor(car)}
                      disabled={workingCarId === car.id}
                      className="h-8 min-w-[76px] rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => openImageManager(car)}
                      className="h-8 min-w-[76px] rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
                    >
                      Images
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {imageManagerCarId ? (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">Images: {imageManagerCarTitle}</h3>
            <button
              type="button"
              onClick={closeImageManager}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-500"
            >
              Close
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="admin-car-images" className="inline-flex cursor-pointer rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700">
              Select Images
            </label>
            <input
              ref={imageFileInputRef}
              id="admin-car-images"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              multiple
              onChange={(event) => appendImageFiles(Array.from(event.target.files ?? []))}
              className="sr-only"
            />
            <button
              type="button"
              onClick={saveManagedImages}
              disabled={imageSaving || imageLoading}
              className="rounded-lg bg-[#ff7a1a] px-3 py-2 text-sm font-semibold text-white hover:bg-[#ff8e3a] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {imageSaving ? "Saving..." : "Save Images"}
            </button>
          </div>

          {imageMessage ? <p className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{imageMessage}</p> : null}
          {imageError ? <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-700">{imageError}</p> : null}

          {imageLoading ? (
            <p className="text-sm text-slate-600">Loading images...</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onManagedImageDragEnd}>
              <SortableContext items={imageManagerItems.map((item) => item.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {imageManagerItems.map((item, index) => (
                    <SortableManagedImageCard
                      key={item.id}
                      item={item}
                      index={index}
                      total={imageManagerItems.length}
                      onRemove={removeManagedImage}
                      onMoveStep={moveManagedImageStep}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>
      ) : null}

      {editingCarId ? (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Edit Car: {editingCarId}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={editForm.brand} onChange={(event) => setEditForm((prev) => ({ ...prev, brand: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Brand" />
            <input value={editForm.model} onChange={(event) => setEditForm((prev) => ({ ...prev, model: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Model" />
            <input value={editForm.title} onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2" placeholder="Title" />
            <input value={editForm.price} onChange={(event) => setEditForm((prev) => ({ ...prev, price: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Price" />
            <input value={editForm.year} onChange={(event) => setEditForm((prev) => ({ ...prev, year: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Year" />
            <input value={editForm.mileage} onChange={(event) => setEditForm((prev) => ({ ...prev, mileage: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Mileage" />
            <input value={editForm.stock_no} onChange={(event) => setEditForm((prev) => ({ ...prev, stock_no: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Stock No" />
            <input value={editForm.engine} onChange={(event) => setEditForm((prev) => ({ ...prev, engine: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Engine" />
            <input value={editForm.trans} onChange={(event) => setEditForm((prev) => ({ ...prev, trans: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Transmission" />
            <input value={editForm.fuel} onChange={(event) => setEditForm((prev) => ({ ...prev, fuel: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Fuel" />
            <select value={editForm.status} onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value }))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="active">active</option>
              <option value="hidden">hidden</option>
              <option value="sold">sold</option>
            </select>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full border-collapse text-sm">
              <tbody>
                {detailRows.map((row) => (
                  <tr key={`${row.leftKey}-${row.rightKey}`} className="border-b border-slate-200 last:border-b-0">
                    <td className="w-1/4 bg-slate-50 px-3 py-2 font-medium text-slate-700">{row.leftLabel}</td>
                    <td className="w-1/4 px-3 py-2">
                      <input
                        value={detailForm[row.leftKey] ?? ""}
                        onChange={(event) => setDetailForm((prev) => ({ ...prev, [row.leftKey]: event.target.value }))}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        placeholder="Fill in"
                      />
                    </td>
                    <td className="w-1/4 bg-slate-50 px-3 py-2 font-medium text-slate-700">{row.rightLabel}</td>
                    <td className="w-1/4 px-3 py-2">
                      <input
                        value={detailForm[row.rightKey] ?? ""}
                        onChange={(event) => setDetailForm((prev) => ({ ...prev, [row.rightKey]: event.target.value }))}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        placeholder="Fill in"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => saveEdit(false)}
              disabled={workingCarId === editingCarId}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {workingCarId === editingCarId ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => saveEdit(true)}
              disabled={workingCarId === editingCarId}
              className="rounded-lg border border-rose-300 px-4 py-2 text-xs font-semibold text-rose-700 hover:border-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {workingCarId === editingCarId ? "Saving..." : "Save & Down Shelf"}
            </button>
            <button
              type="button"
              onClick={() => setEditingCarId(null)}
              disabled={workingCarId === editingCarId}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </section>
      ) : null}
    </section>
  );
}
