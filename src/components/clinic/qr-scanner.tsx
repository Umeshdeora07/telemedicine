"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { Button } from "@/components/ui/button";

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

/** Camera QR scanner: uses the built-in BarcodeDetector where available, jsQR otherwise. */
export function QrScanner({ onResult }: { onResult: (text: string) => void }) {
  const { t } = useI18n();
  const video = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);
  const cb = useRef(onResult);
  useEffect(() => {
    cb.current = onResult;
  }, [onResult]);

  useEffect(() => {
    if (!on) return;
    done.current = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (stopped) return stream.getTracks().forEach((tr) => tr.stop());
        const v = video.current!;
        v.srcObject = stream;
        await v.play();
        const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
        const detector = BD ? new BD({ formats: ["qr_code"] }) : null;
        const jsqr = detector ? null : (await import("jsqr")).default;
        const tick = async () => {
          if (stopped || done.current) return;
          if (v.readyState >= 2) {
            let text: string | null = null;
            if (detector) {
              const codes = await detector.detect(v).catch(() => []);
              text = codes[0]?.rawValue ?? null;
            } else if (jsqr && ctx) {
              canvas.width = v.videoWidth;
              canvas.height = v.videoHeight;
              ctx.drawImage(v, 0, 0);
              const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
              text = jsqr(img.data, img.width, img.height)?.data ?? null;
            }
            if (text) {
              done.current = true;
              navigator.vibrate?.(80);
              cb.current(text);
              setOn(false);
              return;
            }
          }
          raf = requestAnimationFrame(() => void tick());
        };
        void tick();
      } catch {
        setError(t("We couldn't open the camera. Allow camera access, or type the code instead."));
        setOn(false);
      }
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [on, t]);

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-navy">
        <video ref={video} className={on ? "size-full object-cover" : "hidden"} muted playsInline aria-label={t("Camera preview")} />
        {on ? <div className="pointer-events-none absolute inset-10 rounded-2xl border-4 border-white/80" aria-hidden /> : (
          <div className="grid size-full place-items-center text-white/80"><Camera className="size-16" aria-hidden /></div>
        )}
      </div>
      {error ? <p role="alert" className="text-center text-sm font-medium text-danger">{error}</p> : null}
      <div className="flex justify-center">
        {on ? (
          <Button variant="secondary" onClick={() => setOn(false)}><CameraOff className="size-5" aria-hidden />{t("Stop camera")}</Button>
        ) : (
          <Button size="lg" onClick={() => { setError(null); setOn(true); }}><Camera className="size-5" aria-hidden />{t("Scan visit pass")}</Button>
        )}
      </div>
    </div>
  );
}
