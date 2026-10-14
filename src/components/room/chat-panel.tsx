"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Paperclip, Send } from "lucide-react";
import { useI18n } from "@/i18n/client";
import type { ChatMessage } from "./use-room";
import { cn } from "@/lib/utils";

/** Chat with file sharing. Used inside calls and for the free follow-up chat. */
export function ChatPanel({ apptId, messages, onSent, disabled, disabledText, className }: { apptId: string; messages: ChatMessage[]; onSent?: () => void; disabled?: boolean; disabledText?: string; className?: string }) {
  const { t, intl } = useI18n();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const post = async (body: string, documentId?: string) => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/rooms/${apptId}/message`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body, documentId }) });
    setBusy(false);
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? t("Message not sent. Try again."));
    else onSent?.();
  };

  const sendFile = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("file", f);
    fd.set("appointmentId", apptId);
    fd.set("category", f.type.startsWith("image/") ? "photo" : "report");
    fd.set("title", f.name.replace(/\.\w+$/, ""));
    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) return setError(json.error);
    await post(t("Shared a file: {name}", { name: json.title }), json.id);
  };

  const time = (iso: string) => new Intl.DateTimeFormat(intl, { hour: "numeric", minute: "2-digit" }).format(new Date(iso));

  return (
    <section className={cn("flex min-h-0 flex-col", className)} aria-label={t("Chat")}>
      <ol ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3" aria-live="polite" aria-relevant="additions">
        {messages.length === 0 ? <li className="py-6 text-center text-sm text-fg-muted">{t("No messages yet.")}</li> : null}
        {messages.map((m) =>
          m.kind === "system" ? (
            <li key={m.id} className="text-center text-sm text-fg-muted">
              {t(m.body)}
            </li>
          ) : (
            <li key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] rounded-2xl px-3 py-2", m.mine ? "rounded-ee-sm bg-primary text-on-primary" : "rounded-es-sm bg-surface-2 text-fg")}>
                {!m.mine ? <p className="text-xs font-semibold opacity-80">{m.senderName}</p> : null}
                {m.documentId ? (
                  <a href={`/api/documents/${m.documentId}`} target="_blank" rel="noopener" className="flex items-center gap-1.5 underline">
                    <FileText className="size-4" aria-hidden />
                    {m.body}
                  </a>
                ) : (
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                )}
                <p className="mt-0.5 text-end text-[0.7rem] opacity-75">{time(m.createdAt)}</p>
              </div>
            </li>
          ),
        )}
      </ol>
      {error ? <p role="alert" className="px-3 text-sm text-danger">{error}</p> : null}
      {disabled ? (
        <p className="border-t border-line p-3 text-center text-sm text-fg-muted">{disabledText}</p>
      ) : (
        <form
          className="flex items-end gap-1.5 border-t border-line p-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = text.trim();
            if (!v) return;
            setText("");
            void post(v);
          }}
        >
          <button type="button" onClick={() => fileRef.current?.click()} className="tap grid place-items-center rounded-xl text-fg-muted hover:bg-surface-2" aria-label={t("Share a file or report")} disabled={busy}>
            <Paperclip className="size-5" aria-hidden />
          </button>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => void sendFile(e.target.files?.[0]).then(() => (e.target.value = ""))} />
          <label htmlFor={`chat-${apptId}`} className="sr-only">{t("Message")}</label>
          <textarea
            id={`chat-${apptId}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                (e.currentTarget.form as HTMLFormElement).requestSubmit();
              }
            }}
            rows={1}
            placeholder={t("Type a message")}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-field bg-surface px-3 py-2.5 focus:border-primary focus:outline-none"
          />
          <button type="submit" disabled={busy || !text.trim()} className="tap grid place-items-center rounded-xl bg-primary text-on-primary disabled:opacity-50" aria-label={t("Send")}>
            <Send className="size-5 rtl:-scale-x-100" aria-hidden />
          </button>
        </form>
      )}
    </section>
  );
}
