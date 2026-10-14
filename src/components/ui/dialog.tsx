"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Accessible modal built on the native <dialog> element (focus trap and Esc for free). */
export function Dialog({
  open,
  onClose,
  title,
  children,
  className,
  closeLabel = "Close",
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  className?: string;
  closeLabel?: string;
  dismissible?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        if (!dismissible) e.preventDefault();
        else onClose();
      }}
      onClose={onClose}
      aria-labelledby="dialog-title"
      className={cn(
        "m-auto w-[min(32rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-auto rounded-2xl border border-line bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/50",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <h2 id="dialog-title" className="text-lg font-bold">
          {title}
        </h2>
        {dismissible ? (
          <button type="button" onClick={onClose} className="tap -m-2 grid place-items-center rounded-lg text-fg-muted hover:bg-surface-2" aria-label={closeLabel}>
            <X className="size-5" aria-hidden />
          </button>
        ) : null}
      </div>
      <div className="px-5 py-4">{children}</div>
    </dialog>
  );
}
