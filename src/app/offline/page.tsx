import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export const metadata: Metadata = { title: "You're offline" };

/** Shown by the service worker when there's no internet. Kept simple and static. */
export default function Offline() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-5 p-6 text-center">
      <Logo />
      <WifiOff className="size-14 text-fg-muted" aria-hidden />
      <h1 className="text-2xl font-extrabold">You're offline</h1>
      <p className="text-fg-muted">Check your internet connection and try again. Visit passes and prescriptions you opened before are still available.</p>
      <p className="rounded-xl bg-danger-soft p-3 font-semibold text-danger">Medical emergency? Call 112 (India) or your local emergency number.</p>
      <Link href="/" className="font-semibold text-primary underline">Try again</Link>
    </main>
  );
}
