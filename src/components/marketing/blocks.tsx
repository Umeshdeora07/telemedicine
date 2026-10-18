import type { ReactNode } from "react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { JsonLd } from "@/components/common/json-ld";
import { cn } from "@/lib/utils";

/** Heading for a marketing section, with an optional eyebrow, description and action (such as a "See all" link). */
export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  id?: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl space-y-2">
        {eyebrow ? <p className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p> : null}
        <h2 id={id} className="text-2xl font-extrabold sm:text-3xl">
          {title}
        </h2>
        {description ? <p className="text-lg text-fg-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Questions and answers that open one at a time, plus FAQPage structured data. Pass translated text. */
export function FaqList({ items, className }: { items: { q: string; a: string }[]; className?: string }) {
  return (
    <>
      <div className={cn("divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface shadow-card", className)}>
        {items.map(({ q, a }) => (
          <details key={q} className="group">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-heading hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
              <span>{q}</span>
              <ChevronDown className="size-5 shrink-0 text-primary transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="px-5 pb-5 text-fg-muted">{a}</p>
          </details>
        ))}
      </div>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
        }}
      />
    </>
  );
}

export type Step = { title: string; text: string; Icon?: LucideIcon };

/**
 * Numbered steps. `layout="row"` puts them side by side from md (good for 3 or
 * 4 steps); `layout="column"` keeps them in a list with a line joining the numbers.
 */
export function StepList({ steps, layout = "row", className }: { steps: Step[]; layout?: "row" | "column"; className?: string }) {
  if (layout === "column") {
    return (
      <ol className={cn("space-y-0", className)}>
        {steps.map(({ title, text }, i) => (
          <li key={title} className="relative flex gap-4 pb-6 last:pb-0">
            {i < steps.length - 1 ? <span aria-hidden className="absolute start-5 top-11 bottom-1 w-px -translate-x-1/2 bg-line" /> : null}
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-base font-bold text-on-primary">
              {i + 1}
            </span>
            <div className="min-w-0 pt-1.5">
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="mt-1 text-fg-muted">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ol className={cn("grid gap-4", steps.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3", className)}>
      {steps.map(({ title, text, Icon }, i) => (
        <li key={title} className="card flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-base font-bold text-on-primary">
              {i + 1}
            </span>
            {Icon ? <Icon className="size-6 text-primary" aria-hidden /> : null}
          </div>
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="text-fg-muted">{text}</p>
        </li>
      ))}
    </ol>
  );
}

/** A short list with tick marks. */
export function CheckList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <span aria-hidden className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
            <Check className="size-3.5" strokeWidth={3} />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Cards with an icon, a title and a sentence. */
export function FeatureGrid({
  items,
  className,
}: {
  items: { Icon: LucideIcon; title: string; text: ReactNode }[];
  className?: string;
}) {
  return (
    <ul className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {items.map(({ Icon, title, text }) => (
        <li key={title} className="card flex gap-4 p-5">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
            <Icon className="size-6" />
          </span>
          <div className="min-w-0">
            <h3 className="font-bold">{title}</h3>
            <p className="mt-1 text-fg-muted">{text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Closing call to action on a blue band. */
export function CtaBand({ id, title, text, children }: { id?: string; title: string; text?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="container-page py-12">
      <div className="flex flex-col gap-6 rounded-3xl bg-primary px-6 py-8 text-on-primary sm:px-10 sm:py-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <h2 id={id} className="text-2xl font-extrabold text-on-primary sm:text-3xl">
            {title}
          </h2>
          {text ? <p className="text-lg text-on-primary/90">{text}</p> : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:shrink-0">{children}</div>
      </div>
    </section>
  );
}
