"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, CheckCircle2, Mic, MicOff, Wifi, WifiOff, XCircle } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export type JoinChoice = { stream: MediaStream | null; video: boolean; audio: boolean };

type Net = { status: "checking" | "good" | "ok" | "weak" | "offline"; ms?: number; type?: string };

/** Camera, microphone and network check before joining. */
export function TechCheck({ wantVideo, onReady, joinLabel }: { wantVideo: boolean; onReady: (c: JoinChoice) => void; joinLabel: string }) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [net, setNet] = useState<Net>({ status: "checking" });
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [camId, setCamId] = useState<string>("");
  const [micId, setMicId] = useState<string>("");
  const [videoOn, setVideoOn] = useState(wantVideo);

  const start = useCallback(async () => {
    stream?.getTracks().forEach((tr) => tr.stop());
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: micId ? { deviceId: { exact: micId }, echoCancellation: true, noiseSuppression: true } : { echoCancellation: true, noiseSuppression: true },
        video: videoOn ? { ...(camId ? { deviceId: { exact: camId } } : { facingMode: "user" }), width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } } : false,
      });
      setStream(s);
      setErr(null);
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCams(devices.filter((d) => d.kind === "videoinput"));
      setMics(devices.filter((d) => d.kind === "audioinput"));
    } catch (e) {
      const name = (e as DOMException).name;
      setErr(
        name === "NotAllowedError"
          ? t("Camera or microphone permission was blocked. Tap the lock icon next to the web address, allow camera and microphone, then try again.")
          : name === "NotFoundError"
            ? t("We couldn't find a camera or microphone. Check it is connected, or join by audio or chat.")
            : name === "NotReadableError"
              ? t("Another app is using your camera or microphone. Close it (for example WhatsApp or Zoom) and try again.")
              : t("We couldn't start your camera or microphone. You can still join by chat."),
      );
    }
  }, [camId, micId, videoOn]); // eslint-disable-line react-hooks/exhaustive-deps

  // (Re)start the camera when the chosen devices change. State is only set after
  // the async getUserMedia call resolves, so this doesn't cascade renders.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camId, micId, videoOn]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
    if (!stream?.getAudioTracks().length) return;
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    src.connect(an);
    const data = new Uint8Array(an.frequencyBinCount);
    let raf = 0;
    const loop = () => {
      an.getByteTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
      setLevel(Math.min(1, peak / 64));
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      void ctx.close();
    };
  }, [stream]);

  useEffect(() => {
    (async () => {
      if (!navigator.onLine) return setNet({ status: "offline" });
      const started = performance.now();
      try {
        await fetch(`/api/health?ping=${Date.now()}`, { cache: "no-store" });
        const ms = Math.round(performance.now() - started);
        const type = (navigator as unknown as { connection?: { effectiveType?: string } }).connection?.effectiveType;
        setNet({ status: ms < 300 && type !== "2g" ? "good" : ms < 900 ? "ok" : "weak", ms, type });
      } catch {
        setNet({ status: "offline" });
      }
    })();
  }, []);

  const camOk = Boolean(stream?.getVideoTracks().length);
  const micOk = Boolean(stream?.getAudioTracks().length);

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-navy">
        {videoOn && camOk ? (
          <video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full -scale-x-100 object-cover" aria-label={t("Your camera preview")} />
        ) : (
          <div className="grid aspect-video place-items-center text-on-navy">
            <CameraOff className="size-10" aria-hidden />
            <span className="sr-only">{t("Camera is off")}</span>
          </div>
        )}
      </div>
      <ul className="grid gap-2 sm:grid-cols-3">
        <CheckItem ok={wantVideo ? camOk : true} label={wantVideo ? (camOk ? t("Camera works") : t("Camera not working")) : t("Camera not needed")} Icon={camOk ? Camera : CameraOff} />
        <li className={cn("flex items-center gap-2 rounded-xl border p-3", micOk ? "border-success/40 bg-success-soft" : "border-danger/40 bg-danger-soft")}>
          {micOk ? <Mic className="size-5 text-success" aria-hidden /> : <MicOff className="size-5 text-danger" aria-hidden />}
          <span className="flex-1">{micOk ? t("Microphone works. Say something.") : t("Microphone not working")}</span>
          {micOk ? (
            <span className="h-2 w-14 overflow-hidden rounded-full bg-line" role="meter" aria-label={t("Microphone level")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(level * 100)}>
              <span className="block h-full bg-success transition-[width]" style={{ width: `${Math.round(level * 100)}%` }} />
            </span>
          ) : null}
        </li>
        <CheckItem
          ok={net.status === "good" || net.status === "ok"}
          warn={net.status === "weak"}
          label={net.status === "checking" ? t("Checking network…") : net.status === "offline" ? t("You're offline") : net.status === "weak" ? t("Weak network. Audio may work better.") : t("Network is fine")}
          Icon={net.status === "offline" ? WifiOff : Wifi}
        />
      </ul>
      {err ? (
        <p role="alert" className="rounded-xl bg-danger-soft p-3 text-[0.9375rem]">
          {err}
        </p>
      ) : null}
      {cams.length > 1 || mics.length > 1 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {cams.length > 1 && wantVideo ? (
            <div>
              <label htmlFor="cam" className="text-sm font-medium">{t("Camera")}</label>
              <Select id="cam" value={camId} onChange={(e) => setCamId(e.target.value)}>
                <option value="">{t("Default")}</option>
                {cams.map((c, i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `${t("Camera")} ${i + 1}`}</option>)}
              </Select>
            </div>
          ) : null}
          {mics.length > 1 ? (
            <div>
              <label htmlFor="mic" className="text-sm font-medium">{t("Microphone")}</label>
              <Select id="mic" value={micId} onChange={(e) => setMicId(e.target.value)}>
                <option value="">{t("Default")}</option>
                {mics.map((c, i) => <option key={c.deviceId} value={c.deviceId}>{c.label || `${t("Microphone")} ${i + 1}`}</option>)}
              </Select>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-2 sm:flex">
        <Button size="lg" className="sm:flex-1" onClick={() => onReady({ stream, video: videoOn && camOk, audio: micOk })} disabled={!stream && !err}>
          {joinLabel}
        </Button>
        {wantVideo && camOk ? (
          <Button variant="outline" size="lg" onClick={() => setVideoOn(false)}>
            {t("Audio only")}
          </Button>
        ) : null}
        {err && !videoOn ? null : err ? (
          <Button variant="outline" size="lg" onClick={() => void start()}>
            {t("Try again")}
          </Button>
        ) : null}
        <Button variant="ghost" size="lg" onClick={() => { stream?.getTracks().forEach((tr) => tr.stop()); onReady({ stream: null, video: false, audio: false }); }}>
          {t("Join by chat only")}
        </Button>
      </div>
    </div>
  );
}

function CheckItem({ ok, warn, label, Icon }: { ok: boolean; warn?: boolean; label: string; Icon: typeof Camera }) {
  return (
    <li className={cn("flex items-center gap-2 rounded-xl border p-3", ok ? "border-success/40 bg-success-soft" : warn ? "border-warning/40 bg-warning-soft" : "border-danger/40 bg-danger-soft")}>
      <Icon className={cn("size-5", ok ? "text-success" : warn ? "text-warning" : "text-danger")} aria-hidden />
      <span className="flex-1">{label}</span>
      {ok ? <CheckCircle2 className="size-5 text-success" aria-hidden /> : <XCircle className={cn("size-5", warn ? "text-warning" : "text-danger")} aria-hidden />}
    </li>
  );
}
