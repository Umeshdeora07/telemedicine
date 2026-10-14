"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Siren, Stethoscope, Video } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { AGE_GROUPS, AREAS, DURATIONS, FOLLOW_UPS, RED_FLAGS, SEVERITIES, type AreaId, type TriageAnswers, type Urgency } from "@/lib/triage";
import { submitTriage } from "@/server/actions/triage";
import { Button, ButtonLink } from "@/components/ui/button";
import { RadioCard } from "@/components/ui/field";
import { Stepper } from "@/components/ui/stepper";
import { Alert } from "@/components/ui/alert";

const TOTAL = 5;

export function TriageFlow({ specialtyNames }: { specialtyNames: Record<string, string> }) {
  const { t } = useI18n();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [a, setA] = useState<Partial<TriageAnswers>>({ redFlags: [], followUps: {} });
  const [result, setResult] = useState<{ urgency: Urgency; specialtySlug: string; reasons: string[] } | null>(null);
  const [pending, start] = useTransition();

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(1, s - 1));
  const finish = (answers: TriageAnswers) =>
    start(async () => {
      const r = await submitTriage(answers);
      if (r.urgency === "emergency") {
        const flags = answers.redFlags.length ? answers.redFlags.join(",") : "";
        router.push(`/emergency?flags=${flags}&from=triage`);
        return;
      }
      setResult(r);
      setStep(TOTAL + 1);
    });

  if (result) {
    const spec = specialtyNames[result.specialtySlug] ?? result.specialtySlug;
    const urgencyText = {
      now: { title: t("See a doctor now"), text: t("Use Consult now to talk to the first available doctor."), tone: "danger" as const },
      today: { title: t("See a doctor today"), text: t("Book a consult for later today."), tone: "warning" as const },
      this_week: { title: t("See a doctor this week"), text: t("Book a consult at a time that suits you in the next few days."), tone: "info" as const },
      emergency: { title: "", text: "", tone: "danger" as const },
    }[result.urgency];
    return (
      <div className="space-y-5" aria-live="polite">
        <Alert tone={urgencyText.tone} title={urgencyText.title}>
          {urgencyText.text}
        </Alert>
        <div className="card space-y-3 p-5">
          <p className="text-fg-muted">{t("Suggested doctor")}</p>
          <p className="flex items-center gap-2 text-xl font-bold text-heading">
            <Stethoscope className="size-6 text-primary" aria-hidden />
            {t(spec)}
          </p>
          <ul className="list-disc space-y-1 ps-5 text-[0.9375rem]">
            {result.reasons.map((r) => (
              <li key={r}>{t(r)}</li>
            ))}
          </ul>
          <p className="text-sm text-fg-muted">{t("This is not a diagnosis. Your answers will be shared with the doctor you book.")}</p>
        </div>
        <div className="grid gap-3 sm:flex">
          {result.urgency === "now" ? (
            <ButtonLink href={`/consult-now?specialty=${result.specialtySlug}`} size="lg">
              <Video className="size-5" aria-hidden />
              {t("Consult now")}
            </ButtonLink>
          ) : (
            <ButtonLink href={`/doctors?specialty=${result.specialtySlug}${result.urgency === "today" ? "&today=1" : ""}`} size="lg">
              <Clock className="size-5" aria-hidden />
              {result.urgency === "today" ? t("See doctors available today") : t("Choose a doctor")}
            </ButtonLink>
          )}
          <Button variant="outline" size="lg" onClick={() => { setResult(null); setStep(1); setA({ redFlags: [], followUps: {} }); }}>
            {t("Start again")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Stepper current={step} total={TOTAL} label={t("Step {current} of {total}", { current: step, total: TOTAL })} />
      {step > 1 ? (
        <button type="button" onClick={back} className="tap inline-flex items-center gap-1 font-semibold text-primary">
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> {t("Back")}
        </button>
      ) : null}

      {step === 1 ? (
        <fieldset className="space-y-3">
          <legend className="text-xl font-bold text-heading">{t("Who is this for?")}</legend>
          <div className="grid gap-2">
            {AGE_GROUPS.map((g) => (
              <RadioCard key={g.id} name="age" value={g.id} checked={a.age === g.id} onChange={(v) => { setA({ ...a, age: v as TriageAnswers["age"] }); next(); }}>
                <span className="font-medium">{t(g.label)}</span>
              </RadioCard>
            ))}
          </div>
        </fieldset>
      ) : null}

      {step === 2 ? (
        <fieldset className="space-y-3">
          <legend className="flex items-center gap-2 text-xl font-bold text-heading">
            <Siren className="size-6 text-danger" aria-hidden />
            {t("Is any of this happening right now?")}
          </legend>
          <div className="grid gap-2">
            {RED_FLAGS.map((f) => {
              const on = a.redFlags?.includes(f.id);
              return (
                <label key={f.id} className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3 ${on ? "border-danger bg-danger-soft" : "border-field bg-surface"}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => setA({ ...a, redFlags: on ? a.redFlags!.filter((x) => x !== f.id) : [...(a.redFlags ?? []), f.id] })}
                    className="mt-0.5 size-6 shrink-0 accent-[var(--danger-solid)]"
                  />
                  <span>{t(f.label)}</span>
                </label>
              );
            })}
          </div>
          {a.redFlags?.length ? (
            <Button variant="danger" size="lg" className="w-full" onClick={() => router.push(`/emergency?flags=${a.redFlags!.join(",")}&from=triage`)}>
              <Siren className="size-5" aria-hidden />
              {t("Get emergency help")}
            </Button>
          ) : (
            <Button size="lg" className="w-full" onClick={next}>
              {t("None of these")}
            </Button>
          )}
        </fieldset>
      ) : null}

      {step === 3 ? (
        <fieldset className="space-y-3">
          <legend className="text-xl font-bold text-heading">{t("What is the main problem?")}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {AREAS.map((ar) => (
              <RadioCard key={ar.id} name="area" value={ar.id} checked={a.area === ar.id} onChange={(v) => { setA({ ...a, area: v as AreaId, followUps: {} }); next(); }}>
                <span className="font-medium">{t(ar.label)}</span>
              </RadioCard>
            ))}
          </div>
        </fieldset>
      ) : null}

      {step === 4 ? (
        <div className="space-y-6">
          <fieldset className="space-y-3">
            <legend className="text-xl font-bold text-heading">{t("How long has it been going on?")}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {DURATIONS.map((d) => (
                <RadioCard key={d.id} name="duration" value={d.id} checked={a.duration === d.id} onChange={(v) => setA({ ...a, duration: v as TriageAnswers["duration"] })}>
                  <span className="font-medium">{t(d.label)}</span>
                </RadioCard>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-3">
            <legend className="text-xl font-bold text-heading">{t("How bad is it?")}</legend>
            <div className="grid gap-2">
              {SEVERITIES.map((d) => (
                <RadioCard key={d.id} name="severity" value={d.id} checked={a.severity === d.id} onChange={(v) => setA({ ...a, severity: v as TriageAnswers["severity"] })}>
                  <span className="font-medium">{t(d.label)}</span>
                </RadioCard>
              ))}
            </div>
          </fieldset>
          <Button size="lg" className="w-full" disabled={!a.duration || !a.severity} onClick={next}>
            {t("Continue")}
          </Button>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="space-y-4">
          {(FOLLOW_UPS[a.area as AreaId] ?? []).length ? (
            (FOLLOW_UPS[a.area as AreaId] ?? []).map((q) => (
              <fieldset key={q.id} className="space-y-2">
                <legend className="font-semibold text-heading">{t(q.label)}</legend>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    [true, t("Yes")],
                    [false, t("No")],
                  ].map(([v, label]) => (
                    <RadioCard key={String(v)} name={q.id} value={String(v)} checked={a.followUps?.[q.id] === v} onChange={() => setA({ ...a, followUps: { ...a.followUps, [q.id]: v as boolean } })}>
                      <span className="font-medium">{label as string}</span>
                    </RadioCard>
                  ))}
                </div>
              </fieldset>
            ))
          ) : (
            <p className="text-fg-muted">{t("Thanks. Tap below to see our suggestion.")}</p>
          )}
          <Button
            size="lg"
            className="w-full"
            disabled={pending || (FOLLOW_UPS[a.area as AreaId] ?? []).some((q) => a.followUps?.[q.id] === undefined)}
            onClick={() => finish(a as TriageAnswers)}
          >
            {t("See suggestion")}
          </Button>
        </div>
      ) : null}
      <p className="text-sm text-fg-muted">
        {t("This tool helps you choose a doctor. It does not diagnose or give treatment advice.")} <Link href="/emergency" className="text-danger underline">{t("Emergency?")}</Link>
      </p>
    </div>
  );
}
