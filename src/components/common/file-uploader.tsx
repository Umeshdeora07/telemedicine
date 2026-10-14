"use client";

import { useRef, useState } from "react";
import { Camera, FileText, Loader2, Paperclip, Trash2 } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { formatBytes } from "@/lib/format";

export type Uploaded = { id: string; title: string; mimeType: string; sizeBytes: number };

/** Shrink photos before upload (faster on slow networks, and enough detail for doctors). */
async function compressImage(file: File, maxSide = 1800, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/heic" || file.size < 400_000) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export function FileUploader({
  fields,
  initial = [],
  onChange,
  label,
  hint,
  name,
  category = "report",
  allowCamera = true,
}: {
  fields: Record<string, string>;
  initial?: Uploaded[];
  onChange?: (files: Uploaded[]) => void;
  label?: string;
  hint?: string;
  name?: string;
  category?: string;
  allowCamera?: boolean;
}) {
  const { t } = useI18n();
  const [files, setFiles] = useState<Uploaded[]>(initial);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  const upload = async (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);
    for (const raw of Array.from(list)) {
      setBusy((b) => b + 1);
      try {
        const file = await compressImage(raw);
        const fd = new FormData();
        fd.set("file", file);
        fd.set("category", raw.type.startsWith("image/") && category === "report" ? "photo" : category);
        fd.set("title", raw.name.replace(/\.\w+$/, ""));
        for (const [k, v] of Object.entries(fields)) fd.set(k, v);
        const res = await fetch("/api/uploads", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? t("Upload failed"));
        setFiles((f) => {
          const next = [...f, json as Uploaded];
          onChange?.(next);
          return next;
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : t("Upload failed. Please try again."));
      } finally {
        setBusy((b) => b - 1);
      }
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
    if (res.ok)
      setFiles((f) => {
        const next = f.filter((x) => x.id !== id);
        onChange?.(next);
        return next;
      });
  };

  return (
    <div className="space-y-2">
      {label ? <p className="font-medium text-heading">{label}</p> : null}
      {hint ? <p className="text-sm text-fg-muted">{hint}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} className="tap inline-flex items-center gap-2 rounded-xl border border-dashed border-field px-4 font-semibold text-primary hover:bg-primary-soft">
          <Paperclip className="size-5" aria-hidden />
          {t("Add files")}
        </button>
        {allowCamera ? (
          <button type="button" onClick={() => camRef.current?.click()} className="tap inline-flex items-center gap-2 rounded-xl border border-dashed border-field px-4 font-semibold text-primary hover:bg-primary-soft sm:hidden">
            <Camera className="size-5" aria-hidden />
            {t("Take a photo")}
          </button>
        ) : null}
        <input ref={inputRef} type="file" multiple accept="image/*,application/pdf" className="sr-only" onChange={(e) => upload(e.target.files).then(() => (e.target.value = ""))} tabIndex={-1} aria-hidden />
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => upload(e.target.files).then(() => (e.target.value = ""))} tabIndex={-1} aria-hidden />
      </div>
      {busy ? (
        <p role="status" className="flex items-center gap-2 text-sm text-fg-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden /> {t("Uploading…")}
        </p>
      ) : null}
      {error ? <p role="alert" className="text-sm font-medium text-danger">{error}</p> : null}
      {files.length ? (
        <ul className="space-y-1.5">
          {files.map((f) => (
            <li key={f.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
              <a href={`/api/documents/${f.id}`} target="_blank" rel="noopener" className="flex min-w-0 items-center gap-2 hover:underline">
                <FileText className="size-4 shrink-0 text-primary" aria-hidden />
                <span className="truncate">{f.title}</span>
                <span className="shrink-0 text-xs text-fg-muted">{formatBytes(f.sizeBytes)}</span>
              </a>
              <button type="button" onClick={() => remove(f.id)} className="tap grid place-items-center rounded-lg text-fg-muted hover:text-danger" aria-label={t("Remove {name}", { name: f.title })}>
                <Trash2 className="size-4" aria-hidden />
              </button>
              {name ? <input type="hidden" name={name} value={f.id} /> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
