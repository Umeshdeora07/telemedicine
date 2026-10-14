"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

const SPEECH_LANG: Record<string, string> = { en: "en-IN", hi: "hi-IN", ar: "ar-AE", bn: "bn-IN", fr: "fr-FR", ru: "ru-RU", sw: "sw-KE" };

/**
 * Voice input for any text field: tap the mic and speak. Uses the browser's
 * speech recognition (where available); appends what was heard to the field.
 */
export function VoiceInput({ targetId, className, append = true }: { targetId: string; className?: string; append?: boolean }) {
  const { t, locale } = useI18n();
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<SR | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    setSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  if (!supported) return null;

  const toggle = () => {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = SPEECH_LANG[locale] ?? "en-IN";
    r.interimResults = false;
    r.continuous = false;
    r.onresult = (e) => {
      const text = Array.from(e.results)
        .map((res) => res[0]?.transcript ?? "")
        .join(" ")
        .trim();
      const el = document.getElementById(targetId) as HTMLInputElement | HTMLTextAreaElement | null;
      if (el && text) {
        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
        const value = append && el.value ? `${el.value.trim()} ${text}` : text;
        setter?.call(el, value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.focus();
      }
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={listening}
      aria-label={listening ? t("Stop voice input") : t("Speak instead of typing")}
      title={listening ? t("Listening… tap to stop") : t("Speak instead of typing")}
      className={cn("tap grid shrink-0 place-items-center rounded-xl", listening ? "bg-danger-soft text-danger" : "text-primary hover:bg-primary-soft", className)}
    >
      {listening ? <MicOff className="size-5" aria-hidden /> : <Mic className="size-5" aria-hidden />}
    </button>
  );
}
