"use client";

import { useState, useTransition } from "react";
import { useI18n } from "@/i18n/client";
import { doctorReplyAction } from "@/server/actions/after-consult";
import { Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function ReviewReply({ id, initial }: { id: string; initial: string | null }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initial ?? "");
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  if (!open)
    return (
      <div className="space-y-2">
        {saved ? <p className="rounded-lg border-s-4 border-primary bg-surface-2 p-3 text-[0.9375rem]"><strong>{t("Your reply:")}</strong> {saved}</p> : null}
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>{saved ? t("Edit reply") : t("Reply publicly")}</Button>
      </div>
    );
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await doctorReplyAction(id, text);
          if (r.ok) {
            setSaved(text.trim() || null);
            setOpen(false);
          }
        });
      }}
    >
      <label htmlFor={`r-${id}`} className="font-medium">{t("Reply (shown on your profile)")}</label>
      <Textarea id={`r-${id}`} value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000} />
      <p className="text-sm text-fg-muted">{t("Do not mention any health details of the patient in a public reply.")}</p>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? t("Saving…") : t("Save reply")}</Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
      </div>
    </form>
  );
}
