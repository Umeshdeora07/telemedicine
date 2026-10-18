"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { submitReviewAction } from "@/server/actions/after-consult";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const TAGS = ["Listened well", "Explained clearly", "On time", "Clear video", "Helpful plan", "Kind and patient"];

export function ReviewForm({ apptId, doctorName }: { apptId: string; doctorName: string }) {
  const { t } = useI18n();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (done) return <p role="status" className="font-semibold text-success">{t("Thank you! Your review helps other patients.")}</p>;
  return (
    <div className="space-y-3">
      <fieldset>
        <legend className="mb-1 font-medium">{t("How was your consultation with {name}?", { name: doctorName })}</legend>
        <div className="flex gap-1" role="radiogroup" aria-label={t("Rating")}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={t("{n} stars", { n })} onClick={() => setRating(n)} className="tap grid place-items-center rounded-lg">
              <Star className={cn("size-8", n <= rating ? "fill-accent text-accent" : "text-field")} aria-hidden />
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-1.5">
        {TAGS.map((tag) => (
          <button key={tag} type="button" aria-pressed={tags.includes(tag)} onClick={() => setTags((ts) => (ts.includes(tag) ? ts.filter((x) => x !== tag) : [...ts, tag]))} className={cn("tap rounded-full border px-3 text-sm", tags.includes(tag) ? "border-primary bg-primary-soft font-semibold" : "border-line")}>
            {t(tag)}
          </button>
        ))}
      </div>
      <label htmlFor="review-text" className="sr-only">{t("Your review")}</label>
      <Textarea id="review-text" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Anything else to share? (optional)")} />
      {err ? <p role="alert" className="text-sm text-danger">{err}</p> : null}
      <Button disabled={!rating || pending} onClick={() => start(async () => { const r = await submitReviewAction(apptId, rating, text, tags); if (r.ok) setDone(true); else setErr(r.error); })}>
        {t("Post review")}
      </Button>
    </div>
  );
}
