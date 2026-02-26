"use client";

import { useMemo, useState } from "react";

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

  const canLoad = useMemo(() => !loading, [loading]);

  async function loadCars() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/cars", {
        method: "GET",
        headers: adminToken.trim() ? { "x-admin-token": adminToken.trim() } : undefined,
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

  async function downShelf(carId: string) {
    setWorkingCarId(carId);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/cars", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...(adminToken.trim() ? { "x-admin-token": adminToken.trim() } : {}),
        },
        body: JSON.stringify({ car_id: carId, action: "down_shelf" }),
      });
      const payload = (await response.json()) as { car?: CarListItem } & ApiErrorPayload;
      if (!response.ok) {
        throw new Error([payload.error, payload.hint].filter(Boolean).join(" | ") || "Failed to down-shelf");
      }

      const updatedCar = payload.car;
      if (updatedCar) {
        setCars((prev) => prev.map((car) => (car.id === carId ? { ...car, ...updatedCar } : car)));
      }
      setMessage(`Car ${carId} is now hidden.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setWorkingCarId(null);
    }
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
        headers: {
          "content-type": "application/json",
          ...(adminToken.trim() ? { "x-admin-token": adminToken.trim() } : {}),
        },
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
          headers: {
            "content-type": "application/json",
            ...(adminToken.trim() ? { "x-admin-token": adminToken.trim() } : {}),
          },
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
                      onClick={() => downShelf(car.id)}
                      disabled={car.status === "hidden" || workingCarId === car.id}
                      className="h-8 min-w-[76px] rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
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

      {editingCarId ? (
        <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Edit Car: {editingCarId}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={editForm.brand}
              onChange={(event) => setEditForm((prev) => ({ ...prev, brand: event.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Brand"
            />
            <input
              value={editForm.model}
              onChange={(event) => setEditForm((prev) => ({ ...prev, model: event.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Model"
            />
            <input
              value={editForm.title}
              onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
              placeholder="Title"
            />
            <input
              value={editForm.price}
              onChange={(event) => setEditForm((prev) => ({ ...prev, price: event.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Price"
            />
            <input
              value={editForm.year}
              onChange={(event) => setEditForm((prev) => ({ ...prev, year: event.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Year"
            />
            <input
              value={editForm.mileage}
              onChange={(event) => setEditForm((prev) => ({ ...prev, mileage: event.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Mileage"
            />
            <input
              value={editForm.stock_no}
              onChange={(event) => setEditForm((prev) => ({ ...prev, stock_no: event.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Stock No"
            />
            <input
              value={editForm.engine}
              onChange={(event) => setEditForm((prev) => ({ ...prev, engine: event.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Engine"
            />
            <input
              value={editForm.trans}
              onChange={(event) => setEditForm((prev) => ({ ...prev, trans: event.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Transmission"
            />
            <input
              value={editForm.fuel}
              onChange={(event) => setEditForm((prev) => ({ ...prev, fuel: event.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Fuel"
            />
            <select
              value={editForm.status}
              onChange={(event) => setEditForm((prev) => ({ ...prev, status: event.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
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
                        onChange={(event) =>
                          setDetailForm((prev) => ({
                            ...prev,
                            [row.leftKey]: event.target.value,
                          }))
                        }
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                        placeholder="Fill in"
                      />
                    </td>
                    <td className="w-1/4 bg-slate-50 px-3 py-2 font-medium text-slate-700">{row.rightLabel}</td>
                    <td className="w-1/4 px-3 py-2">
                      <input
                        value={detailForm[row.rightKey] ?? ""}
                        onChange={(event) =>
                          setDetailForm((prev) => ({
                            ...prev,
                            [row.rightKey]: event.target.value,
                          }))
                        }
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
