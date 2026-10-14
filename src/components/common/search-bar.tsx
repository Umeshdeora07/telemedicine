import { Search } from "lucide-react";
import { VoiceInput } from "./voice-input";

/** One search box for symptoms, specialties, doctors and hospitals. */
export function SearchBar({
  label,
  placeholder,
  submitLabel,
  suggestions,
  defaultValue,
  id = "q",
  action = "/doctors",
  hidden,
}: {
  label: string;
  placeholder: string;
  submitLabel: string;
  suggestions: string[];
  defaultValue?: string;
  id?: string;
  action?: string;
  hidden?: Record<string, string>;
}) {
  return (
    <form action={action} role="search" className="w-full">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="flex items-center gap-1 rounded-2xl border border-field bg-surface p-1.5 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
        <Search className="ms-2 size-5 shrink-0 text-fg-muted" aria-hidden />
        <input
          id={id}
          name="q"
          type="search"
          list={`${id}-suggestions`}
          defaultValue={defaultValue}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          className="min-h-11 min-w-0 flex-1 bg-transparent px-1 text-base text-fg placeholder:text-fg-muted/80 focus:outline-none"
        />
        <datalist id={`${id}-suggestions`}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        {hidden ? Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />) : null}
        <VoiceInput targetId={id} append={false} />
        <button type="submit" className="tap rounded-xl bg-primary px-4 font-semibold text-on-primary hover:bg-primary-hover">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
