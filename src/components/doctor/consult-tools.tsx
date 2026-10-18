"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, Ban, Building2, Check, FlaskConical, Plus, Siren, Stethoscope, Trash2, UserCheck, CalendarClock } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { allowedLists, blockReason, checkPrescription, FREQUENCIES, listLabel, TIMINGS, type TpgList } from "@/lib/tpg";
import { addActionAction, confirmIdentityAction, endConsultAction, issueRxAction, saveNotesAction } from "@/server/actions/doctor-consult";
import { cn } from "@/lib/utils";

export type Med = { id: string; genericName: string; form: string; strengths: string[]; drugClass: string; tpgList: TpgList; brandExamples: string[] };
type Notes = {
  complaint: string;
  history: string;
  findings: string;
  diagnosis: string;
  provisional: boolean;
  advice: string;
  investigations: string[];
  warningSigns: string;
  patientSummary: string;
  privateNotes: string;
  followUpDate: string | null;
};
type Item = { key: string; medicineId: string | null; name: string; form: string; strength: string; dose: string; frequency: string; timing: string; durationDays: number; instructions: string; tpgList: TpgList; drugClass?: string };

const DEFAULT_DOSE: Record<string, string> = {
  tablet: "1 tablet",
  capsule: "1 capsule",
  syrup: "5 ml",
  suspension: "10 ml",
  drops: "5 drops",
  "nasal drops": "2 drops each nostril",
  "eye drops": "1 drop each eye",
  cream: "Apply a thin layer",
  gel: "Apply a thin layer",
  ointment: "Apply a thin layer",
  lotion: "Apply a thin layer",
  inhaler: "2 puffs",
  sachet: "1 sachet",
};

export function ConsultTools({
  apptId,
  mode,
  consultType,
  allergies,
  currentMedicines,
  medicines,
  initialNotes,
  identityConfirmed,
  isMinor,
  needsExplicitConsent,
  clinics,
  specialties,
  issuedRx,
  status,
}: {
  apptId: string;
  mode: "video" | "audio" | "chat" | "in_clinic";
  consultType: "first" | "follow_up";
  allergies: string[];
  currentMedicines: string[];
  medicines: Med[];
  initialNotes: Notes;
  identityConfirmed: boolean;
  isMinor: boolean;
  needsExplicitConsent: boolean;
  clinics: { id: string; name: string }[];
  specialties: { slug: string; name: string }[];
  issuedRx: { id: string; number: string }[];
  status: string;
}) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"notes" | "rx" | "actions">("notes");
  const [identity, setIdentity] = useState(identityConfirmed);
  const [notes, setNotes] = useState<Notes>(initialNotes);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const firstRender = useRef(true);

  // Autosave notes shortly after the doctor stops typing.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaved("saving");
    const id = setTimeout(async () => {
      const r = await saveNotesAction(apptId, notes);
      setSaved(r.ok ? "saved" : "error");
    }, 1200);
    return () => clearTimeout(id);
  }, [notes, apptId]);

  const set = <K extends keyof Notes>(k: K, v: Notes[K]) => setNotes((n) => ({ ...n, [k]: v }));
  const done = status === "completed";

  return (
    <div className="space-y-4 p-4">
      {!identity ? <IdentityCheck apptId={apptId} isMinor={isMinor} needsExplicitConsent={needsExplicitConsent} onDone={() => setIdentity(true)} /> : (
        <p className="flex items-center gap-2 rounded-xl bg-success-soft p-2.5 text-sm text-success"><UserCheck className="size-4" aria-hidden />{t("Identity confirmed (name, age, sex)")}{isMinor ? ` · ${t("guardian present")}` : ""}</p>
      )}
      <div role="tablist" aria-label={t("Consult tools")} className="grid grid-cols-3 gap-1 rounded-xl bg-surface-2 p-1">
        {(
          [
            ["notes", t("Notes")],
            ["rx", t("Prescription")],
            ["actions", t("Next steps")],
          ] as const
        ).map(([k, label]) => (
          <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("tap rounded-lg text-sm font-semibold", tab === k ? "bg-surface text-heading shadow-sm" : "text-fg-muted")}>
            {label}
          </button>
        ))}
      </div>

      {tab === "notes" ? (
        <div className="space-y-3">
          <p className="text-end text-xs text-fg-muted" aria-live="polite">
            {saved === "saving" ? t("Saving…") : saved === "saved" ? t("Saved") : saved === "error" ? t("Not saved. Check your connection.") : ""}
          </p>
          <Field label={t("Chief complaint")} htmlFor="n-complaint" required>
            <Textarea id="n-complaint" rows={2} value={notes.complaint} onChange={(e) => set("complaint", e.target.value)} />
          </Field>
          <Field label={t("History")} htmlFor="n-history" required>
            <Textarea id="n-history" rows={3} value={notes.history} onChange={(e) => set("history", e.target.value)} />
          </Field>
          <Field label={t("Findings (what you observed)")} htmlFor="n-findings" required>
            <Textarea id="n-findings" rows={2} value={notes.findings} onChange={(e) => set("findings", e.target.value)} />
          </Field>
          <Field label={t("Diagnosis")} htmlFor="n-dx" required>
            <Input id="n-dx" value={notes.diagnosis} onChange={(e) => set("diagnosis", e.target.value)} />
          </Field>
          <Checkbox id="n-prov" checked={notes.provisional} onChange={(e) => set("provisional", e.target.checked)} label={t("Provisional diagnosis")} />
          <Field label={t("Advice")} htmlFor="n-advice" required>
            <Textarea id="n-advice" rows={3} value={notes.advice} onChange={(e) => set("advice", e.target.value)} />
          </Field>
          <Field label={t("Tests (comma separated)")} htmlFor="n-inv">
            <Input id="n-inv" value={notes.investigations.join(", ")} onChange={(e) => set("investigations", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
          </Field>
          <Field label={t("Warning signs to watch for")} htmlFor="n-warn">
            <Textarea id="n-warn" rows={2} value={notes.warningSigns} onChange={(e) => set("warningSigns", e.target.value)} />
          </Field>
          <Field label={t("Summary for the patient, in simple words")} htmlFor="n-sum" required hint={t("No jargon. This is what the patient and family will read.")}>
            <Textarea id="n-sum" rows={3} value={notes.patientSummary} onChange={(e) => set("patientSummary", e.target.value)} />
          </Field>
          <Field label={t("Follow up date")} htmlFor="n-fu">
            <Input id="n-fu" type="date" value={notes.followUpDate ?? ""} onChange={(e) => set("followUpDate", e.target.value || null)} />
          </Field>
          <Field label={t("Private notes (not shown to the patient)")} htmlFor="n-priv">
            <Textarea id="n-priv" rows={2} value={notes.privateNotes} onChange={(e) => set("privateNotes", e.target.value)} />
          </Field>
        </div>
      ) : null}

      {tab === "rx" ? (
        <RxBuilder apptId={apptId} mode={mode} consultType={consultType} allergies={allergies} currentMedicines={currentMedicines} medicines={medicines} notes={notes} identity={identity} issued={issuedRx} />
      ) : null}

      {tab === "actions" ? <Actions apptId={apptId} clinics={clinics} specialties={specialties} done={done} /> : null}
    </div>
  );
}

function IdentityCheck({ apptId, isMinor, needsExplicitConsent, onDone }: { apptId: string; isMinor: boolean; needsExplicitConsent: boolean; onDone: () => void }) {
  const { t } = useI18n();
  const [gName, setGName] = useState("");
  const [gRel, setGRel] = useState("");
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3 rounded-xl border border-warning/50 bg-warning-soft p-3">
      <p className="font-semibold">{t("Before you start: confirm the patient's name, age and sex.")}</p>
      {isMinor ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input placeholder={t("Guardian's name")} value={gName} onChange={(e) => setGName(e.target.value)} aria-label={t("Guardian's name")} />
          <Input placeholder={t("Relationship")} value={gRel} onChange={(e) => setGRel(e.target.value)} aria-label={t("Relationship")} />
        </div>
      ) : null}
      {needsExplicitConsent ? <Checkbox id="xc" checked={consent} onChange={(e) => setConsent(e.target.checked)} label={t("The patient agreed to this teleconsultation. It was booked by a family member, so record explicit consent.")} /> : null}
      {err ? <p role="alert" className="text-sm text-danger">{err}</p> : null}
      <Button
        size="sm"
        disabled={pending || (needsExplicitConsent && !consent)}
        onClick={() =>
          start(async () => {
            const r = await confirmIdentityAction(apptId, { guardianName: gName || undefined, guardianRelationship: gRel || undefined, explicitConsent: needsExplicitConsent ? consent : undefined });
            if (r.ok) onDone();
            else setErr(r.error);
          })
        }
      >
        <Check className="size-4" aria-hidden />
        {t("Confirmed")}
      </Button>
    </div>
  );
}

function RxBuilder({ apptId, mode, consultType, allergies, currentMedicines, medicines, notes, identity, issued }: { apptId: string; mode: "video" | "audio" | "chat" | "in_clinic"; consultType: "first" | "follow_up"; allergies: string[]; currentMedicines: string[]; medicines: Med[]; notes: Notes; identity: boolean; issued: { id: string; number: string }[] }) {
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [diagnosis, setDiagnosis] = useState(notes.diagnosis);
  const [advice, setAdvice] = useState(notes.advice);
  const [ack, setAck] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(issued);
  const [pending, start] = useTransition();
  const allowed = allowedLists(mode, consultType);

  // When the notes panel changes diagnosis/advice, carry them into the prescription if still empty.
  const [seen, setSeen] = useState({ diagnosis: notes.diagnosis, advice: notes.advice });
  if (seen.diagnosis !== notes.diagnosis || seen.advice !== notes.advice) {
    setSeen({ diagnosis: notes.diagnosis, advice: notes.advice });
    if (!diagnosis) setDiagnosis(notes.diagnosis);
    if (!advice) setAdvice(notes.advice);
  }

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return medicines.filter((m) => m.genericName.toLowerCase().includes(s) || m.brandExamples.some((b) => b.toLowerCase().includes(s))).slice(0, 8);
  }, [q, medicines]);

  const checks = useMemo(
    () => checkPrescription(items.map((i) => ({ name: i.name, genericName: i.name, drugClass: i.drugClass, tpgList: i.tpgList })), { mode, consultType, allergies, currentMedicines }),
    [items, mode, consultType, allergies, currentMedicines],
  );
  const blocked = checks.filter((c) => c.blocked).length;
  const warnings = checks.reduce((n, c) => n + c.warnings.length, 0);

  const add = (m: Med) => {
    setItems((list) => [
      ...list,
      { key: crypto.randomUUID(), medicineId: m.id, name: m.genericName, form: m.form, strength: m.strengths[0] ?? "", dose: DEFAULT_DOSE[m.form] ?? "1", frequency: "1-0-1", timing: "after_food", durationDays: 5, instructions: "", tpgList: m.tpgList, drugClass: m.drugClass },
    ]);
    setQ("");
  };
  const update = (key: string, patch: Partial<Item>) => setItems((l) => l.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  return (
    <div className="space-y-4">
      <Alert tone="info">
        {t("This is a {type} by {mode}. Allowed: {lists}.", {
          type: consultType === "first" ? t("first consult") : t("follow up consult"),
          mode: t(mode === "in_clinic" ? "clinic visit" : mode),
          lists: allowed.map((l) => listLabel(l)).join(", "),
        })}{" "}
        {t("Prohibited medicines can never be prescribed online.")}
      </Alert>
      {allergies.length ? (
        <p className="flex flex-wrap items-center gap-1.5 text-sm">
          <AlertTriangle className="size-4 text-danger" aria-hidden />
          {t("Allergies:")} {allergies.map((a) => <Badge key={a} tone="danger">{a}</Badge>)}
        </p>
      ) : null}
      {sent.length ? (
        <Alert tone="success" title={t("Prescription sent")}>
          {sent.map((s) => (
            <a key={s.id} href={`/api/prescriptions/${s.id}/pdf`} target="_blank" rel="noopener" className="me-2 underline">{s.number}</a>
          ))}
        </Alert>
      ) : null}
      <Field label={t("Diagnosis on the prescription")} htmlFor="rx-dx" required>
        <Input id="rx-dx" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
      </Field>
      <div className="relative">
        <label htmlFor="med-search" className="font-medium text-heading">{t("Add medicine")}</label>
        <Input id="med-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search by generic or brand name")} autoComplete="off" role="combobox" aria-expanded={results.length > 0} aria-controls="med-results" />
        {results.length ? (
          <ul id="med-results" role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-xl border border-line bg-surface shadow-xl">
            {results.map((m) => {
              const reason = blockReason(m.tpgList, mode, consultType);
              return (
                <li key={m.id} role="option" aria-selected={false}>
                  <button type="button" onClick={() => add(m)} className={cn("flex w-full items-center justify-between gap-2 px-3 py-2.5 text-start hover:bg-surface-2", reason && "opacity-70")}>
                    <span>
                      <span className="font-semibold">{m.genericName}</span> <span className="text-sm text-fg-muted">{m.form} · {m.strengths.join(", ")}</span>
                      {m.brandExamples.length ? <span className="block text-xs text-fg-muted">{m.brandExamples.join(", ")}</span> : null}
                    </span>
                    <Badge tone={m.tpgList === "prohibited" ? "danger" : reason ? "warning" : "primary"}>{listLabel(m.tpgList)}</Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
        <button type="button" className="mt-1 text-sm font-semibold text-primary underline" onClick={() => setItems((l) => [...l, { key: crypto.randomUUID(), medicineId: null, name: "", form: "tablet", strength: "", dose: "1 tablet", frequency: "1-0-1", timing: "after_food", durationDays: 5, instructions: "", tpgList: "O" }])}>
          <Plus className="inline size-4" aria-hidden /> {t("Medicine not in the list")}
        </button>
      </div>

      <ol className="space-y-3">
        {items.map((it, i) => {
          const c = checks[i];
          return (
            <li key={it.key} className={cn("space-y-2 rounded-xl border p-3", c?.blocked ? "border-danger bg-danger-soft" : c?.warnings.length ? "border-warning bg-warning-soft" : "border-line bg-surface")}>
              <div className="flex items-start justify-between gap-2">
                {it.medicineId ? (
                  <p className="font-semibold">{it.name} <span className="font-normal text-fg-muted">({it.form})</span></p>
                ) : (
                  <div className="grid flex-1 gap-2 sm:grid-cols-2">
                    <Input value={it.name} onChange={(e) => update(it.key, { name: e.target.value })} placeholder={t("Medicine name")} aria-label={t("Medicine name")} />
                    <Select value={it.tpgList} onChange={(e) => update(it.key, { tpgList: e.target.value as TpgList })} aria-label={t("TPG list")}>
                      <option value="O">List O</option>
                      <option value="A">List A</option>
                      <option value="B">List B</option>
                    </Select>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Badge tone={it.tpgList === "prohibited" ? "danger" : "primary"}>{listLabel(it.tpgList)}</Badge>
                  <button type="button" onClick={() => setItems((l) => l.filter((x) => x.key !== it.key))} className="tap grid place-items-center rounded-lg text-fg-muted hover:text-danger" aria-label={t("Remove {name}", { name: it.name || t("medicine") })}>
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
              {c?.blocked ? <p className="flex items-start gap-1.5 text-sm font-medium text-danger"><Ban className="mt-0.5 size-4 shrink-0" aria-hidden />{t(c.blocked)}</p> : null}
              {c?.warnings.map((w) => <p key={w} className="flex items-start gap-1.5 text-sm text-warning"><AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />{t(w)}</p>)}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Input value={it.strength} onChange={(e) => update(it.key, { strength: e.target.value })} aria-label={t("Strength")} placeholder={t("Strength")} list={`str-${it.key}`} />
                <datalist id={`str-${it.key}`}>{medicines.find((m) => m.id === it.medicineId)?.strengths.map((s) => <option key={s} value={s} />)}</datalist>
                <Input value={it.dose} onChange={(e) => update(it.key, { dose: e.target.value })} aria-label={t("Dose")} placeholder={t("Dose")} />
                <Select value={it.frequency} onChange={(e) => update(it.key, { frequency: e.target.value })} aria-label={t("How often")}>
                  {Object.entries(FREQUENCIES).map(([k, v]) => <option key={k} value={k}>{k} ({t(v.label)})</option>)}
                </Select>
                <Select value={it.timing} onChange={(e) => update(it.key, { timing: e.target.value })} aria-label={t("When")}>
                  {Object.entries(TIMINGS).map(([k, v]) => <option key={k} value={k}>{v ? t(v) : t("any time")}</option>)}
                </Select>
                <div className="flex items-center gap-1.5">
                  <Input type="number" min={1} max={365} value={it.durationDays} onChange={(e) => update(it.key, { durationDays: Number(e.target.value) || 1 })} aria-label={t("Days")} />
                  <span className="text-sm text-fg-muted">{t("days")}</span>
                </div>
                <Input value={it.instructions} onChange={(e) => update(it.key, { instructions: e.target.value })} aria-label={t("Instructions")} placeholder={t("Instructions")} className="col-span-2 sm:col-span-1" />
              </div>
            </li>
          );
        })}
      </ol>

      <Field label={t("Advice")} htmlFor="rx-advice" required>
        <Textarea id="rx-advice" rows={3} value={advice} onChange={(e) => setAdvice(e.target.value)} />
      </Field>
      {warnings ? <Checkbox id="ack" checked={ack} onChange={(e) => setAck(e.target.checked)} label={t("I've reviewed the warnings above and want to continue.")} /> : null}
      {!identity ? <p className="text-sm text-warning">{t("Confirm the patient's identity first.")}</p> : null}
      {err ? <p role="alert" className="text-sm font-medium text-danger">{err}</p> : null}
      <Button
        className="w-full"
        disabled={pending || !identity || blocked > 0 || (warnings > 0 && !ack) || !diagnosis.trim() || items.some((i) => !i.name.trim())}
        onClick={() =>
          start(async () => {
            setErr(null);
            const r = await issueRxAction(apptId, {
              diagnosis,
              provisional: notes.provisional,
              advice,
              investigations: notes.investigations,
              followUpDate: notes.followUpDate,
              acknowledgedWarnings: ack,
              items: items.map(({ medicineId, name, form, strength, dose, frequency, timing, durationDays, instructions, tpgList }) => ({ medicineId, name, form, strength, dose, frequency, timing, durationDays, instructions, tpgList: medicineId ? undefined : tpgList })),
            });
            if (r.ok) {
              setSent((s) => [...s, r.data]);
              setItems([]);
              setAck(false);
            } else setErr(r.error);
          })
        }
      >
        {t("Sign and send digital prescription")}
      </Button>
      <p className="text-xs text-fg-muted">{t("The prescription is digitally signed and carries a QR code that pharmacists can verify.")}</p>
    </div>
  );
}

function Actions({ apptId, clinics, specialties, done }: { apptId: string; clinics: { id: string; name: string }[]; specialties: { slug: string; name: string }[]; done: boolean }) {
  const { t } = useI18n();
  const [open, setOpen] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [tests, setTests] = useState("");
  const [clinicId, setClinicId] = useState(clinics[0]?.id ?? "");
  const [spec, setSpec] = useState(specialties[0]?.slug ?? "");
  const [days, setDays] = useState(7);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (type: "in_person_visit" | "specialist_referral" | "tests" | "emergency" | "follow_up", details: Record<string, unknown>) =>
    start(async () => {
      const r = await addActionAction(apptId, type, details);
      setMsg(r.ok ? t("Done. The patient can see this now.") : r.error);
      if (r.ok) setOpen(null);
    });
  const btn = (key: string, label: string, Icon: typeof Siren, tone?: "danger") => (
    <button type="button" onClick={() => setOpen(open === key ? null : key)} aria-expanded={open === key} className={cn("tap flex items-center gap-2 rounded-xl border p-3 text-start font-semibold", tone === "danger" ? "border-danger/50 text-danger hover:bg-danger-soft" : "border-line hover:bg-surface-2", open === key && "ring-2 ring-primary")}>
      <Icon className="size-5" aria-hidden /> {label}
    </button>
  );
  return (
    <div className="space-y-3">
      {msg ? <p role="status" className="rounded-xl bg-surface-2 p-2 text-sm">{msg}</p> : null}
      <div className="grid gap-2">
        {btn("tests", t("Order tests"), FlaskConical)}
        {open === "tests" ? (
          <div className="space-y-2 rounded-xl bg-surface-2 p-3">
            <Input value={tests} onChange={(e) => setTests(e.target.value)} placeholder={t("e.g. CBC, HbA1c, Lipid profile")} aria-label={t("Tests")} />
            <Button size="sm" disabled={pending || !tests.trim()} onClick={() => run("tests", { tests: tests.split(",").map((s) => s.trim()).filter(Boolean), reason })}>{t("Order")}</Button>
          </div>
        ) : null}
        {btn("visit", t("Needs a visit in person"), Building2)}
        {open === "visit" ? (
          <div className="space-y-2 rounded-xl bg-surface-2 p-3">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("Reason, e.g. examination and ECG")} aria-label={t("Reason")} />
            {clinics.length ? (
              <Select value={clinicId} onChange={(e) => setClinicId(e.target.value)} aria-label={t("Clinic")}>
                {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            ) : null}
            <Select value={String(days)} onChange={(e) => setDays(Number(e.target.value))} aria-label={t("How soon")}>
              <option value="1">{t("Within 1 day")}</option>
              <option value="3">{t("Within 3 days")}</option>
              <option value="7">{t("This week")}</option>
              <option value="14">{t("Within 2 weeks")}</option>
            </Select>
            <Button size="sm" disabled={pending || !reason.trim()} onClick={() => run("in_person_visit", { reason, clinicId: clinicId || null, dueInDays: days, urgency: days <= 1 ? "today" : "this_week" })}>{t("Recommend clinic visit")}</Button>
          </div>
        ) : null}
        {btn("refer", t("Refer to specialist"), Stethoscope)}
        {open === "refer" ? (
          <div className="space-y-2 rounded-xl bg-surface-2 p-3">
            <Select value={spec} onChange={(e) => setSpec(e.target.value)} aria-label={t("Specialty")}>
              {specialties.map((s) => <option key={s.slug} value={s.slug}>{t(s.name)}</option>)}
            </Select>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("Reason")} aria-label={t("Reason")} />
            <Button size="sm" disabled={pending || !reason.trim()} onClick={() => run("specialist_referral", { specialtySlug: spec, reason })}>{t("Refer")}</Button>
          </div>
        ) : null}
        {btn("fu", t("Schedule follow up"), CalendarClock)}
        {open === "fu" ? (
          <div className="space-y-2 rounded-xl bg-surface-2 p-3">
            <Select value={String(days)} onChange={(e) => setDays(Number(e.target.value))} aria-label={t("When")}>
              {[3, 7, 14, 28, 42, 90].map((d) => <option key={d} value={d}>{t("In {n} days", { n: d })}</option>)}
            </Select>
            <Button size="sm" disabled={pending} onClick={() => run("follow_up", { dueInDays: days, reason: reason || undefined })}>{t("Recommend follow up")}</Button>
          </div>
        ) : null}
        {btn("em", t("Emergency: go to hospital"), Siren, "danger")}
        {open === "em" ? (
          <div className="space-y-2 rounded-xl bg-danger-soft p-3">
            <p className="text-sm">{t("This ends the consult and tells the patient to go to the nearest hospital or call their local emergency number.")}</p>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("Reason (for the record)")} aria-label={t("Reason")} />
            <Button size="sm" variant="danger" disabled={pending} onClick={() => run("emergency", { reason })}>{t("Send to emergency")}</Button>
          </div>
        ) : null}
      </div>
      <div className="border-t border-line pt-3">
        <Button
          variant={done ? "outline" : "primary"}
          className="w-full"
          disabled={pending || done}
          onClick={() =>
            start(async () => {
              const r = await endConsultAction(apptId, "completed");
              setMsg(r.ok ? t("Consult ended. The patient has their summary.") : r.error);
            })
          }
        >
          {done ? t("Consult ended") : t("End consult and send summary")}
        </Button>
      </div>
    </div>
  );
}
