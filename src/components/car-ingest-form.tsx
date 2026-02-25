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
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

type SubmitState = "idle" | "submitting" | "success" | "error";
type CarIngestFormProps = {
  requireAdminToken?: boolean;
};

type SelectedImage = {
  id: string;
  file: File;
};

type SpeechRecognitionResultAlternative = {
  transcript: string;
};

type SpeechRecognitionEventLike = {
  results?: ArrayLike<ArrayLike<SpeechRecognitionResultAlternative>>;
};

type SpeechRecognition = {
  lang: string;
  continuous?: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

const SAMPLE_TEXT = `brand: Mazda
model: CX-5
title: 2021 Mazda CX-5 Touring
price: $18,900
year: 2021
mileage: 22,500
engine: 2.5L I4
trans: Automatic
fuel: Gasoline
status: available
stock_no: NR-0003`;

function createSelectedImage(file: File): SelectedImage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`,
    file,
  };
}

type SortablePreviewCardProps = {
  item: SelectedImage;
  index: number;
  total: number;
  onPreview: (url: string) => void;
  onRemove: (id: string) => void;
  onMoveStep: (index: number, direction: "left" | "right") => void;
};

function SortablePreviewCard({ item, index, total, onPreview, onRemove, onMoveStep }: SortablePreviewCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const objectUrl = useMemo(() => URL.createObjectURL(item.file), [item.file]);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "z-20 opacity-70" : ""}>
      <div className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white text-left">
        <button
          type="button"
          onClick={() => onPreview(objectUrl)}
          className="block w-full text-left"
          {...attributes}
          {...listeners}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={objectUrl} alt={item.file.name} className="h-24 w-full object-cover transition group-hover:scale-105" />
          <span className="block truncate px-2 py-1 text-[11px] text-slate-600">{item.file.name}</span>
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
          aria-label={`Remove ${item.file.name}`}
        >
          <span className="h-[2px] w-2.5 rounded bg-white" />
        </button>

        <div className="flex items-center justify-center gap-1 px-2 pb-2">
          <button
            type="button"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onMoveStep(index, "left");
            }}
            aria-label={`Move ${item.file.name} left`}
            disabled={index === 0}
            className={`inline-flex h-5 w-5 items-center justify-center rounded border text-[10px] ${
              index === 0 ? "cursor-not-allowed border-slate-200 text-slate-300" : "border-slate-300 text-slate-700"
            }`}
          >
            {"<"}
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
              onMoveStep(index, "right");
            }}
            aria-label={`Move ${item.file.name} right`}
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

export function CarIngestForm({ requireAdminToken = false }: CarIngestFormProps) {
  const [carText, setCarText] = useState(SAMPLE_TEXT);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [adminToken, setAdminToken] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 220,
        tolerance: 6,
      },
    }),
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const buttonLabel = useMemo(() => {
    if (state === "submitting") return "Uploading...";
    return "Auto Upload Car";
  }, [state]);

  const selectedFilesLabel = useMemo(() => {
    if (images.length === 0) return "No images selected yet";
    const preview = images
      .slice(0, 2)
      .map((item) => item.file.name)
      .join(", ");
    if (images.length <= 2) return preview;
    return `${preview} +${images.length - 2} more`;
  }, [images]);

  function resetForm() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setCarText(SAMPLE_TEXT);
    setImages([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsListening(false);
    setSpeechSupported(true);
    setState("idle");
    setMessage("");
    setPreviewImageUrl(null);
  }

  function removeSelectedFile(id: string) {
    setImages((prev) => prev.filter((item) => item.id !== id));
  }

  function clearSelectedFiles() {
    setImages([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPreviewImageUrl(null);
  }

  function appendSelectedFiles(nextFiles: File[]) {
    if (nextFiles.length === 0) return;
    setImages((prev) => [...prev, ...nextFiles.map((file) => createSelectedImage(file))]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function moveImageByStep(index: number, direction: "left" | "right") {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    setImages((prev) => arrayMove(prev, index, targetIndex));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setImages((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === active.id);
      const newIndex = prev.findIndex((item) => item.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  async function startSpeechInput() {
    if (typeof window === "undefined") return;
    if (isListening) return;

    const SpeechRecognitionClass =
      (window as Window & { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition })
        .SpeechRecognition ||
      (window as Window & { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition })
        .webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSpeechSupported(false);
      setState("error");
      setMessage("Current browser does not support speech recognition. Please use Chrome on mobile.");
      return;
    }

    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        setState("error");
        setMessage("Microphone permission denied. Please enable microphone access in browser settings.");
        return;
      }
    }

    const recognition = new SpeechRecognitionClass();
    recognitionRef.current = recognition;
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setIsListening(true);
    setMessage("Listening... speak your car description.");
    recognition.start();

    recognition.onresult = (event) => {
      const lastIndex = (event.results?.length ?? 1) - 1;
      const transcript = event.results?.[lastIndex]?.[0]?.transcript?.trim() || "";
      if (!transcript) return;
      setCarText((prev) => `${prev.trim()}\n${transcript}`.trim());
      setState("idle");
      setMessage("Voice captured. You can edit text before uploading.");
    };

    recognition.onerror = (event) => {
      const code = event?.error || "unknown";
      setState("error");
      if (code === "not-allowed" || code === "service-not-allowed") {
        setMessage("Microphone permission denied. Please allow microphone access in browser settings and retry.");
        return;
      }
      if (code === "no-speech") {
        setMessage("No speech detected. Move closer to microphone and retry.");
        return;
      }
      setMessage(`Speech recognition failed (${code}). Please try again or paste text manually.`);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
  }

  function stopSpeechInput() {
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
    setState("idle");
    setMessage("Voice input stopped.");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("car_text", carText);
      for (const item of images) {
        formData.append("images", item.file);
      }

      const response = await fetch("/api/ingest-car", {
        method: "POST",
        headers: adminToken.trim() ? { "x-admin-token": adminToken.trim() } : undefined,
        body: formData,
      });

      const payload = (await response.json()) as { error?: string; car_id?: string; inserted_car_images?: number };
      if (!response.ok) {
        throw new Error(payload.error || "Upload failed");
      }

      setState("success");
      setMessage(`Created car id: ${payload.car_id} | Inserted ${payload.inserted_car_images ?? 0} car_images rows | DONE`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Auto Listing Upload</h3>
      <p className="mt-1 text-sm text-slate-600">Paste car text (key:value) and choose image files to upload automatically.</p>

      <form className="mt-4 space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-800">Car Description Text</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startSpeechInput}
              disabled={isListening}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isListening ? "Listening..." : "Voice Input"}
            </button>
            <button
              type="button"
              onClick={stopSpeechInput}
              disabled={!isListening}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Stop
            </button>
            {!speechSupported ? <span className="text-xs text-amber-700">Speech not supported in this browser.</span> : null}
          </div>
          <textarea
            value={carText}
            onChange={(event) => setCarText(event.target.value)}
            className="h-56 w-full rounded-xl border border-slate-300 p-3 font-mono text-sm text-slate-900 outline-none focus:border-[#ff7a1a]"
            spellCheck={false}
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-800">Images (.jpg .jpeg .png .webp)</span>
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="car-images-input"
              className="inline-flex cursor-pointer rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Select Images
            </label>
            <span className="max-w-[420px] truncate text-xs text-slate-600">{selectedFilesLabel}</span>
          </div>

          <input
            ref={fileInputRef}
            id="car-images-input"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => appendSelectedFiles(Array.from(event.target.files ?? []))}
            className="sr-only"
          />

          {images.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-700">Selected files: {images.length}</span>
                <button
                  type="button"
                  onClick={clearSelectedFiles}
                  className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:border-slate-500"
                >
                  Clear All
                </button>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={images.map((item) => item.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {images.map((item, index) => (
                      <SortablePreviewCard
                        key={item.id}
                        item={item}
                        index={index}
                        total={images.length}
                        onPreview={setPreviewImageUrl}
                        onRemove={removeSelectedFile}
                        onMoveStep={moveImageByStep}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          ) : null}
        </label>

        {requireAdminToken ? (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-800">Admin Token</span>
            <input
              type="password"
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#ff7a1a]"
              placeholder="Enter ADMIN_INGEST_TOKEN"
              required
            />
          </label>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={state === "submitting"}
            className="rounded-lg bg-[#ff7a1a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ff8e3a] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {buttonLabel}
          </button>
          <button
            type="button"
            onClick={resetForm}
            disabled={state === "submitting"}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            还原
          </button>
        </div>
      </form>

      {message ? (
        <p className={`mt-4 rounded-lg p-3 text-sm ${state === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
          {message}
        </p>
      ) : null}

      {previewImageUrl ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setPreviewImageUrl(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape" || event.key === "Enter" || event.key === " ") setPreviewImageUrl(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewImageUrl}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] rounded-lg border border-slate-700 bg-black object-contain"
          />
        </div>
      ) : null}
    </section>
  );
}
