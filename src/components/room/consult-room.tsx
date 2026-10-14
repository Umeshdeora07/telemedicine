"use client";

import { useClientValue } from "@/lib/use-client-value";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Captions,
  CaptionsOff,
  CircleDot,
  Clock,
  Hourglass,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  MoreHorizontal,
  PhoneOff,
  ShieldCheck,
  SignalLow,
  UserPlus,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Button, ButtonLink } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { TechCheck, type JoinChoice } from "./tech-check";
import { ChatPanel } from "./chat-panel";
import { useRoom, type Caption } from "./use-room";
import { detectLocation, type LocOption } from "@/components/location/location-picker";
import { createInviteAction } from "@/server/actions/room";

type Props = {
  apptId: string;
  role: "patient" | "caregiver" | "doctor" | "interpreter" | "clinic";
  mode: "video" | "audio" | "chat" | "in_clinic";
  doctorName: string;
  patientName: string;
  startAtLabel: string;
  locationOptions: LocOption[];
  bookedLocation: { country: string; region: string | null };
  panel?: ReactNode;
  summaryHref: string;
  backHref: string;
  canInvite: boolean;
};

const SPEECH_LANG: Record<string, string> = { en: "en-IN", hi: "hi-IN", ar: "ar-AE", bn: "bn-IN", fr: "fr-FR", ru: "ru-RU", sw: "sw-KE" };

export function ConsultRoom(p: Props) {
  const { t, locale } = useI18n();
  const isDoctor = p.role === "doctor";
  const needsLocation = p.role === "patient" || p.role === "caregiver";
  const [phase, setPhase] = useState<"check" | "location" | "room">("check");
  const [choice, setChoice] = useState<JoinChoice | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const room = useRoom(p.apptId, { onCaption: (c) => setCaptions((cs) => [...cs.slice(-3), c]) });
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const captionsSupported = useClientValue(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
  }, false);
  const [chatOpen, setChatOpen] = useState(p.mode === "chat");
  const [panelOpen, setPanelOpen] = useState(isDoctor);
  const [menu, setMenu] = useState(false);
  const [invite, setInvite] = useState(false);
  const [weak, setWeak] = useState(false);
  const [weakDismissed, setWeakDismissed] = useState(false);
  const [unread, setUnread] = useState(0);
  const [announce, setAnnounce] = useState("");
  const selfVideo = useRef<HTMLVideoElement>(null);
  const camTrack = useRef<MediaStreamTrack | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);

  const doctorPeer = room.peers.find((x) => x.role === "doctor");
  const others = room.peers.filter((x) => (isDoctor ? true : x.role !== "doctor"));
  const mainPeer = isDoctor ? room.peers.find((x) => x.role === "patient" || x.role === "caregiver") ?? room.peers[0] : doctorPeer;
  const ended = room.state?.status === "completed";
  const recordingOn = Boolean(room.state?.recording?.startedAt && !room.state?.recording?.stoppedAt);

  // Announce people joining or leaving (screen readers).
  const prevPeers = useRef<string[]>([]);
  useEffect(() => {
    const now = room.peers.map((x) => x.peerId);
    const joined = room.peers.filter((x) => !prevPeers.current.includes(x.peerId));
    if (joined.length) setAnnounce(t("{name} joined", { name: joined.map((j) => j.displayName).join(", ") }));
    prevPeers.current = now;
  }, [room.peers]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevMsgs = useRef(0);
  useEffect(() => {
    if (!chatOpen && room.messages.length > prevMsgs.current) setUnread((u) => u + room.messages.slice(prevMsgs.current).filter((m) => !m.mine).length);
    prevMsgs.current = room.messages.length;
  }, [room.messages, chatOpen]);

  const enterRoom = useCallback(
    async (c: JoinChoice) => {
      setChoice(c);
      setMicOn(c.audio);
      setCamOn(c.video);
      camTrack.current = c.stream?.getVideoTracks()[0] ?? null;
      const ok = await room.join(c.stream);
      if (ok) {
        setPhase("room");
        room.reportMedia({ audio: c.audio, video: c.video });
      } else setPhase(needsLocation ? "location" : "check");
    },
    [room, needsLocation],
  );

  useEffect(() => {
    if (selfVideo.current && choice?.stream) selfVideo.current.srcObject = choice.stream;
  }, [choice, phase]);

  // Network quality watch → offer audio or chat without losing the session.
  useEffect(() => {
    if (phase !== "room") return;
    const id = setInterval(async () => setWeak(await room.checkQuality()), 6000);
    return () => clearInterval(id);
  }, [phase, room]);

  // Live captions with the browser's speech recognition.
  useEffect(() => {
    if (!captionsOn || !micOn) return;
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = SPEECH_LANG[locale] ?? "en-IN";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const text = last?.[0]?.transcript?.trim();
      if (text) {
        room.broadcast({ type: "caption", text });
        setCaptions((cs) => [...cs.slice(-3), { from: "me", name: t("You"), text, at: Date.now() }]);
      }
    };
    let alive = true;
    rec.onend = () => alive && rec.start();
    rec.start();
    return () => {
      alive = false;
      rec.stop();
    };
  }, [captionsOn, micOn, locale]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drop old captions.
  useEffect(() => {
    if (!captions.length) return;
    const id = setTimeout(() => setCaptions((cs) => cs.filter((c) => Date.now() - c.at < 8000)), 8000);
    return () => clearTimeout(id);
  }, [captions]);

  // Doctor's device records (audio) only while both sides have agreed.
  useEffect(() => {
    if (!isDoctor) return;
    if (recordingOn && !recorder.current) {
      const ctx = new AudioContext();
      const dest = ctx.createMediaStreamDestination();
      const add = (s: MediaStream | null | undefined) => s?.getAudioTracks().length && ctx.createMediaStreamSource(s).connect(dest);
      add(choice?.stream);
      Object.values(room.remoteStreams).forEach(add);
      const mr = new MediaRecorder(dest.stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined });
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = async () => {
        void ctx.close();
        const fd = new FormData();
        fd.set("file", new File(chunks, `consult-recording-${new Date().toISOString().slice(0, 16)}.webm`, { type: "audio/webm" }));
        fd.set("appointmentId", p.apptId);
        fd.set("category", "recording");
        fd.set("title", t("Consult recording"));
        await fetch("/api/uploads", { method: "POST", body: fd });
      };
      mr.start(5000);
      recorder.current = mr;
    } else if (!recordingOn && recorder.current) {
      recorder.current.stop();
      recorder.current = null;
    }
  }, [recordingOn, isDoctor]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMic = () => {
    const tr = choice?.stream?.getAudioTracks()[0];
    if (!tr) return;
    tr.enabled = !micOn;
    setMicOn(!micOn);
    room.reportMedia({ audio: !micOn, video: camOn, screen: sharing });
  };

  const setVideo = async (on: boolean) => {
    if (!choice?.stream) return;
    if (on) {
      let track = camTrack.current;
      if (!track || track.readyState === "ended") {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 } } });
          track = s.getVideoTracks()[0]!;
          choice.stream.getVideoTracks().forEach((x) => choice.stream!.removeTrack(x));
          choice.stream.addTrack(track);
          camTrack.current = track;
        } catch {
          return;
        }
      }
      // MediaStreamTrack is a browser object we own; enabling it here (in an event handler) is intended.
      // eslint-disable-next-line react-hooks/immutability
      track.enabled = true;
      await room.replaceVideo(track);
      if (selfVideo.current) selfVideo.current.srcObject = choice.stream;
    } else {
      camTrack.current?.stop();
      await room.replaceVideo(null);
    }
    setCamOn(on);
    room.reportMedia({ audio: micOn, video: on, lowBandwidth: !on });
  };

  const toggleShare = async () => {
    if (sharing) {
      await room.replaceVideo(camOn ? camTrack.current : null);
      setSharing(false);
      return;
    }
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const tr = s.getVideoTracks()[0]!;
      tr.onended = () => {
        void room.replaceVideo(camOn ? camTrack.current : null);
        setSharing(false);
      };
      await room.replaceVideo(tr);
      setSharing(true);
    } catch {
      /* cancelled */
    }
  };

  const switchToChat = async () => {
    await setVideo(false);
    setChatOpen(true);
    setWeakDismissed(true);
  };

  const leave = async () => {
    await room.leave();
    window.location.href = ended ? p.summaryHref : p.backHref;
  };

  const requestRecording = async (agree: boolean) => {
    await fetch(`/api/rooms/${p.apptId}/recording`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agree }) });
    setMenu(false);
  };

  /* ---------------------------------------------------------- pre-join */
  if (phase === "check") {
    return (
      <div className="container-page max-w-2xl space-y-5 py-6">
        <div>
          <h1 className="text-2xl font-extrabold">{isDoctor ? t("Consult with {name}", { name: p.patientName }) : t("Consult with {name}", { name: p.doctorName })}</h1>
          <p className="text-fg-muted">{p.startAtLabel}</p>
        </div>
        <Alert tone="info" title={t("Quick check before you join")}>{t("Sit somewhere quiet with light in front of you. Calls are encrypted and not recorded unless everyone agrees.")}</Alert>
        {p.mode === "chat" ? (
          <Button size="lg" className="w-full" onClick={() => (needsLocation ? (setChoice({ stream: null, video: false, audio: false }), setPhase("location")) : enterRoom({ stream: null, video: false, audio: false }))}>
            {t("Open the chat")}
          </Button>
        ) : (
          <TechCheck
            wantVideo={p.mode === "video"}
            joinLabel={isDoctor ? t("Start consult") : t("Continue")}
            onReady={(c) => {
              setChoice(c);
              if (needsLocation) setPhase("location");
              else void enterRoom(c);
            }}
          />
        )}
      </div>
    );
  }

  if (phase === "location") {
    return (
      <LocationConfirm
        apptId={p.apptId}
        patientName={p.role === "patient" ? t("you") : p.patientName}
        options={p.locationOptions}
        initial={p.bookedLocation}
        error={room.error}
        onConfirmed={() => {
          room.setError(null);
          void enterRoom(choice ?? { stream: null, video: false, audio: false });
        }}
      />
    );
  }

  /* -------------------------------------------------------------- room */
  const mainStream = mainPeer ? room.remoteStreams[mainPeer.peerId] : undefined;
  const waiting = !isDoctor && !doctorPeer && !ended;

  return (
    <div className="flex h-[100dvh] flex-col bg-navy text-on-navy">
      <p className="sr-only" aria-live="polite">{announce}</p>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-3 py-2">
        <ShieldCheck className="size-5 text-accent" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-sm">
          <span className="font-semibold">{isDoctor ? p.patientName : p.doctorName}</span>
          <span className="text-navy-muted"> · {t("Encrypted")}</span>
        </p>
        {recordingOn ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-danger-solid px-2.5 py-1 text-xs font-bold text-on-danger" role="status">
            <CircleDot className="size-3.5" aria-hidden /> {t("Recording")}
          </span>
        ) : null}
        {isDoctor && p.panel ? (
          <button type="button" onClick={() => setPanelOpen((o) => !o)} aria-expanded={panelOpen} className="tap rounded-xl bg-white/10 px-3 text-sm font-semibold">
            {panelOpen ? t("Hide notes") : t("Notes & prescription")}
          </button>
        ) : null}
      </div>

      {room.error === "rejoin" ? (
        <div className="mx-3 mb-2 rounded-xl bg-warning-soft p-3 text-fg">
          {t("You were disconnected.")} <button type="button" className="font-semibold underline" onClick={() => window.location.reload()}>{t("Rejoin")}</button>
        </div>
      ) : null}
      {weak && camOn && !weakDismissed ? (
        <div role="alert" className="mx-3 mb-2 flex flex-wrap items-center gap-2 rounded-xl bg-warning-soft p-3 text-fg">
          <SignalLow className="size-5 text-warning" aria-hidden />
          <span className="flex-1">{t("Your network is weak. Switch to audio or chat? You won't lose the consult.")}</span>
          <Button size="sm" onClick={() => { void setVideo(false); setWeakDismissed(true); }}>{t("Audio only")}</Button>
          <Button size="sm" variant="outline" onClick={() => void switchToChat()}>{t("Chat")}</Button>
          <button type="button" onClick={() => setWeakDismissed(true)} className="tap grid place-items-center" aria-label={t("Dismiss")}><X className="size-5" aria-hidden /></button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 gap-2 px-2 pb-2">
        {/* Stage */}
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-black/40">
          {ended ? (
            <div className="m-auto max-w-md space-y-4 p-6 text-center">
              <p className="text-2xl font-bold text-on-navy">{t("The consult has ended")}</p>
              <p className="text-navy-muted">{isDoctor ? t("Notes are saved. The patient has been sent their summary.") : t("Your summary, prescription and next steps are ready.")}</p>
              <ButtonLink href={p.summaryHref} variant="accent" size="lg">{isDoctor ? t("Back to today's queue") : t("See my summary")}</ButtonLink>
            </div>
          ) : waiting ? (
            <WaitingRoom queue={room.queue} doctorName={p.doctorName} />
          ) : (
            <>
              {mainPeer ? <RemoteVideo stream={mainStream} name={mainPeer.displayName} videoOff={!mainPeer.media.video && !mainPeer.media.screen} big /> : <p className="m-auto p-6 text-center text-navy-muted">{t("Waiting for {name} to join…", { name: isDoctor ? p.patientName : p.doctorName })}</p>}
              {/* Other participants */}
              <div className="absolute start-2 top-2 flex flex-col gap-2">
                {others
                  .filter((o) => o.peerId !== mainPeer?.peerId)
                  .map((o) => (
                    <div key={o.peerId} className="w-28 overflow-hidden rounded-xl border border-white/20 sm:w-36">
                      <RemoteVideo stream={room.remoteStreams[o.peerId]} name={o.displayName} videoOff={!o.media.video} />
                    </div>
                  ))}
              </div>
              {captions.length ? (
                <div className="absolute inset-x-3 bottom-3 space-y-1 text-center" aria-live="polite">
                  {captions.map((c) => (
                    <p key={c.at} className="mx-auto w-fit rounded-lg bg-black/75 px-3 py-1 text-[1.05rem]">
                      <span className="font-semibold text-accent">{c.name}: </span>
                      {c.text}
                    </p>
                  ))}
                </div>
              ) : null}
            </>
          )}
          {/* Self view */}
          {choice?.stream && camOn && !ended ? (
            <video ref={selfVideo} autoPlay playsInline muted className="absolute bottom-3 end-3 w-24 -scale-x-100 rounded-xl border-2 border-white/40 sm:w-40" aria-label={t("Your video")} />
          ) : null}
        </div>

        {/* Side panels */}
        {chatOpen ? (
          <aside className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-surface text-fg max-md:fixed max-md:inset-0 max-md:z-50 max-md:max-w-none max-md:rounded-none">
            <div className="flex items-center justify-between border-b border-line p-2 ps-4">
              <h2 className="font-bold">{t("Chat")}</h2>
              <button type="button" onClick={() => setChatOpen(false)} className="tap grid place-items-center rounded-lg" aria-label={t("Close chat")}><X className="size-5" aria-hidden /></button>
            </div>
            <ChatPanel apptId={p.apptId} messages={room.messages} className="flex-1" />
          </aside>
        ) : null}
        {isDoctor && panelOpen && p.panel ? (
          <aside className="w-full max-w-md overflow-y-auto rounded-2xl bg-page text-fg max-lg:fixed max-lg:inset-0 max-lg:z-50 max-lg:max-w-none max-lg:rounded-none" aria-label={t("Notes and prescription")}>
            <div className="flex items-center justify-between border-b border-line bg-surface p-2 ps-4 lg:hidden">
              <h2 className="font-bold">{t("Notes & prescription")}</h2>
              <button type="button" onClick={() => setPanelOpen(false)} className="tap grid place-items-center rounded-lg" aria-label={t("Close")}><X className="size-5" aria-hidden /></button>
            </div>
            {p.panel}
          </aside>
        ) : null}
      </div>

      {/* Controls */}
      {!ended ? (
        <div className="flex items-center justify-center gap-2 px-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-1">
          {choice?.stream?.getAudioTracks().length ? (
            <CtrlButton on={micOn} onClick={toggleMic} label={micOn ? t("Mute") : t("Unmute")} Icon={micOn ? Mic : MicOff} />
          ) : null}
          {p.mode === "video" && choice?.stream ? <CtrlButton on={camOn} onClick={() => void setVideo(!camOn)} label={camOn ? t("Turn camera off") : t("Turn camera on")} Icon={camOn ? Video : VideoOff} /> : null}
          <CtrlButton on={chatOpen} onClick={() => { setChatOpen((o) => !o); setUnread(0); }} label={t("Chat")} Icon={MessageSquare} badge={unread} />
          {p.mode !== "chat" && captionsSupported ? <CtrlButton on={captionsOn} onClick={() => setCaptionsOn((c) => !c)} label={captionsOn ? t("Turn captions off") : t("Turn captions on")} Icon={captionsOn ? Captions : CaptionsOff} className="max-sm:hidden" /> : null}
          {p.mode !== "chat" && typeof navigator !== "undefined" && "getDisplayMedia" in (navigator.mediaDevices ?? {}) ? (
            <CtrlButton on={sharing} onClick={() => void toggleShare()} label={sharing ? t("Stop sharing") : t("Share screen or report")} Icon={MonitorUp} className="max-sm:hidden" />
          ) : null}
          <div className="relative">
            <CtrlButton on={menu} onClick={() => setMenu((m) => !m)} label={t("More options")} Icon={MoreHorizontal} />
            {menu ? (
              <div className="absolute bottom-14 end-0 z-50 w-64 space-y-1 rounded-2xl bg-surface p-2 text-fg shadow-2xl">
                {p.mode !== "chat" ? (
                  <>
                    {captionsSupported ? <MenuItem onClick={() => { setCaptionsOn((c) => !c); setMenu(false); }}>{captionsOn ? t("Turn captions off") : t("Turn captions on")}</MenuItem> : null}
                    {"getDisplayMedia" in (navigator.mediaDevices ?? {}) ? <MenuItem onClick={() => { void toggleShare(); setMenu(false); }}>{sharing ? t("Stop sharing") : t("Share screen or report")}</MenuItem> : null}
                    {camOn ? <MenuItem onClick={() => { void setVideo(false); setMenu(false); }}>{t("Switch to audio only")}</MenuItem> : null}
                    <MenuItem onClick={() => { void switchToChat(); setMenu(false); }}>{t("Switch to chat")}</MenuItem>
                  </>
                ) : null}
                {p.canInvite ? <MenuItem onClick={() => { setInvite(true); setMenu(false); }}><UserPlus className="size-4" aria-hidden />{t("Invite family or interpreter")}</MenuItem> : null}
                {p.role !== "interpreter" ? (
                  <MenuItem onClick={() => void requestRecording(!(isDoctor ? room.state?.recording?.doctor : room.state?.recording?.patient))}>
                    <CircleDot className="size-4" aria-hidden />
                    {(isDoctor ? room.state?.recording?.doctor : room.state?.recording?.patient) ? t("Stop / decline recording") : room.state?.recording?.requestedBy && !recordingOn ? t("Agree to recording") : t("Ask to record this consult")}
                  </MenuItem>
                ) : null}
                <MenuItem onClick={() => window.open("/help/contact?topic=technical", "_blank")}>{t("Report a problem")}</MenuItem>
              </div>
            ) : null}
          </div>
          <button type="button" onClick={() => void leave()} className="tap ms-2 inline-flex items-center gap-2 rounded-full bg-danger-solid px-5 font-semibold text-on-danger" aria-label={t("Leave consult")}>
            <PhoneOff className="size-5" aria-hidden />
            <span className="max-sm:sr-only">{t("Leave")}</span>
          </button>
        </div>
      ) : null}
      {room.state?.recording?.requestedBy && !recordingOn && room.state.recording[isDoctor ? "doctor" : "patient"] === undefined && p.role !== "interpreter" ? (
        <div role="alertdialog" aria-label={t("Recording request")} className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md rounded-2xl bg-surface p-4 text-fg shadow-2xl">
          <p className="font-semibold">{t("Can we record this consult?")}</p>
          <p className="text-sm text-fg-muted">{t("Recording starts only if both you and the other side agree. The recording is saved to the health records.")}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => void requestRecording(true)}>{t("Yes, record")}</Button>
            <Button size="sm" variant="outline" onClick={() => void requestRecording(false)}>{t("No")}</Button>
          </div>
        </div>
      ) : null}
      <InviteDialog open={invite} onClose={() => setInvite(false)} apptId={p.apptId} />
    </div>
  );
}

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
};

function CtrlButton({ on, onClick, label, Icon, badge, className }: { on: boolean; onClick: () => void; label: string; Icon: typeof Mic; badge?: number; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} aria-label={label} title={label} className={cn("relative grid size-12 place-items-center rounded-full", on ? "bg-white/15 text-on-navy" : "bg-white text-navy", className)}>
      <Icon className="size-5" aria-hidden />
      {badge ? <span className="absolute -end-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-bold text-on-accent">{badge}</span> : null}
    </button>
  );
}

function MenuItem({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="tap flex w-full items-center gap-2 rounded-lg px-3 text-start hover:bg-surface-2">
      {children}
    </button>
  );
}

function RemoteVideo({ stream, name, videoOff, big }: { stream?: MediaStream; name: string; videoOff: boolean; big?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div className={cn("relative grid place-items-center bg-black/60", big ? "h-full w-full" : "aspect-video")}>
      <video ref={ref} autoPlay playsInline className={cn("h-full w-full object-contain", videoOff && "invisible absolute")} />
      {videoOff ? (
        <div className="grid place-items-center gap-2 p-4 text-center">
          <span className={cn("grid place-items-center rounded-full bg-white/15 font-bold", big ? "size-24 text-3xl" : "size-10")}>{name.replace(/^Dr\.?\s*/, "")[0]}</span>
          {big ? <span className="text-navy-muted">{name}</span> : null}
        </div>
      ) : null}
      <span className="absolute bottom-1.5 start-1.5 rounded bg-black/60 px-1.5 text-xs">{name}</span>
    </div>
  );
}

function WaitingRoom({ queue, doctorName }: { queue: ReturnType<typeof useRoom>["queue"]; doctorName: string }) {
  const { t } = useI18n();
  return (
    <div className="m-auto max-w-md space-y-5 p-6 text-center" role="status" aria-live="polite">
      <Hourglass className="mx-auto size-12 animate-pulse text-accent" aria-hidden />
      <p className="text-2xl font-bold text-on-navy">{t("You're in the waiting room")}</p>
      <p className="text-navy-muted">{t("{doctor} will let you in. Please keep this page open.", { doctor: doctorName })}</p>
      {queue ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-sm text-navy-muted">{t("Your place in the queue")}</p>
            <p className="text-3xl font-extrabold text-on-navy">{queue.position}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3">
            <p className="flex items-center justify-center gap-1 text-sm text-navy-muted"><Clock className="size-4" aria-hidden />{t("Estimated wait")}</p>
            <p className="text-3xl font-extrabold text-on-navy">{queue.estimatedMinutes <= 1 ? t("Any moment") : t("{n} min", { n: queue.estimatedMinutes })}</p>
          </div>
        </div>
      ) : null}
      {queue?.runningLate ? <p className="rounded-xl bg-accent/20 p-3">{t("The doctor is running about {n} minutes late. Sorry for the wait.", { n: queue.runningLate })}</p> : null}
      {queue?.doctorBusy ? <p className="text-navy-muted">{t("The doctor is finishing another consult.")}</p> : null}
      <p className="text-sm text-navy-muted">{t("If the doctor doesn't join within 10 minutes of your time, you get a full refund automatically.")}</p>
    </div>
  );
}

function LocationConfirm({ apptId, patientName, options, initial, onConfirmed, error }: { apptId: string; patientName: string; options: LocOption[]; initial: { country: string; region: string | null }; onConfirmed: () => void; error: string | null }) {
  const { t } = useI18n();
  const [country, setCountry] = useState(initial.country);
  const [region, setRegion] = useState(initial.region ?? "");
  const [msg, setMsg] = useState<string | null>(error === "confirm_location" ? null : error);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const opt = useMemo(() => options.find((o) => o.code === country), [options, country]);
  const submit = async (source = "self_declared", c = country, r = region) => {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/rooms/${apptId}/location`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country: c, region: r || null, source }) });
    const json = await res.json();
    setBusy(false);
    if (res.ok) return onConfirmed();
    if (json.error === "not_licensed") setBlocked(json.place);
    else setMsg(json.error ?? t("Something went wrong."));
  };
  return (
    <div className="container-page max-w-lg space-y-5 py-8">
      <h1 className="text-2xl font-extrabold">{t("Where is {name} right now?", { name: patientName })}</h1>
      <p className="text-fg-muted">{t("We ask before every consult. Doctors may only treat patients in places where they are licensed.")}</p>
      {blocked ? (
        <Alert tone="danger" title={t("This doctor can't consult a patient in {place}", { place: blocked })}>
          {t("Please reschedule for when the patient is back, or contact support for a refund.")}{" "}
          <Link href={`/consults/${apptId}`} className="font-semibold underline">{t("Manage booking")}</Link>
        </Alert>
      ) : null}
      {msg ? <Alert tone="warning">{msg}</Alert> : null}
      <div className="space-y-3">
        <div>
          <label htmlFor="rc" className="text-sm font-medium">{t("Country")}</label>
          <Select id="rc" value={country} onChange={(e) => { setCountry(e.target.value); setRegion(""); }}>
            {options.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
          </Select>
        </div>
        {opt?.scope === "region" ? (
          <div>
            <label htmlFor="rr" className="text-sm font-medium">{t("State / province")}</label>
            <Select id="rr" value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">{t("Choose")}</option>
              {opt.regions.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
            </Select>
          </div>
        ) : null}
      </div>
      <div className="grid gap-2 sm:flex">
        <Button size="lg" className="sm:flex-1" disabled={busy || (opt?.scope === "region" && !region)} onClick={() => void submit()}>
          {t("Confirm and join")}
        </Button>
        <Button
          size="lg"
          variant="outline"
          disabled={busy}
          onClick={async () => {
            const found = await detectLocation();
            if (!found) return setMsg(t("We couldn't detect your location. Please choose it from the list."));
            setCountry(found.country);
            setRegion(found.region ?? "");
            await submit("device", found.country, found.region ?? "");
          }}
        >
          {t("Use my location")}
        </Button>
      </div>
    </div>
  );
}

function InviteDialog({ open, onClose, apptId }: { open: boolean; onClose: () => void; apptId: string }) {
  const { t } = useI18n();
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [role, setRole] = useState<"caregiver" | "interpreter">("caregiver");
  const [name, setName] = useState("");
  return (
    <Dialog open={open} onClose={() => { onClose(); setLink(null); }} title={t("Invite someone to this call")} closeLabel={t("Close")}>
      {link ? (
        <div className="space-y-3">
          <p>{t("Send this link. It works only for this consult and expires 2 hours after it ends.")}</p>
          <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label={t("Invite link")} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void navigator.clipboard.writeText(link)}>{t("Copy link")}</Button>
            <a className="tap inline-flex items-center rounded-xl border border-field px-3 font-semibold" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(t("Join the doctor consult: {link}", { link }))}`}>
              {t("Share on WhatsApp")}
            </a>
          </div>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const r = await createInviteAction(apptId, role, name);
            setBusy(false);
            if (r.ok) setLink(r.url);
          }}
        >
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="mb-1 font-medium">{t("Who?")}</legend>
            {(["caregiver", "interpreter"] as const).map((r) => (
              <label key={r} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-field p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
                <input type="radio" name="role" checked={role === r} onChange={() => setRole(r)} className="size-5 accent-[var(--primary)]" />
                {r === "caregiver" ? t("Family member") : t("Interpreter")}
              </label>
            ))}
          </fieldset>
          <Field label={t("Their name")} htmlFor="invite-name" required>
            <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Button type="submit" disabled={busy || !name.trim()} className="w-full">{t("Create invite link")}</Button>
        </form>
      )}
    </Dialog>
  );
}
