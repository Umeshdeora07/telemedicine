"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";
import { ChatPanel } from "@/components/room/chat-panel";
import type { ChatMessage } from "@/components/room/use-room";

/** Free follow-up chat with the doctor after the consult (uses the consult's message thread). */
export function FollowUpChat({ apptId, initial, open, closedText }: { apptId: string; initial: ChatMessage[]; open: boolean; closedText: string }) {
  const { t } = useI18n();
  const [messages, setMessages] = useState(initial);
  const refresh = async () => {
    const last = messages[messages.length - 1]?.id ?? 0;
    const res = await fetch(`/api/consults/${apptId}/messages?since=${last}`, { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as { messages: ChatMessage[] };
      if (json.messages.length) setMessages((m) => [...m, ...json.messages.filter((x) => !m.some((y) => y.id === x.id))]);
    }
  };
  useEffect(() => {
    if (!open) return;
    const id = setInterval(refresh, 8000);
    return () => clearInterval(id);
  }); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="card flex h-96 flex-col overflow-hidden">
      <p className="border-b border-line px-4 py-2 text-sm text-fg-muted">{open ? t("Free follow-up chat. The doctor usually replies within a few hours.") : closedText}</p>
      <ChatPanel apptId={apptId} messages={messages} onSent={refresh} disabled={!open} disabledText={closedText} className="flex-1" />
    </div>
  );
}
