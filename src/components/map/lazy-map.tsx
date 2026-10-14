"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "./clinic-map";

const Inner = dynamic(() => import("./clinic-map").then((m) => m.ClinicMap), {
  ssr: false,
  loading: () => <div className="skeleton h-[360px] w-full rounded-2xl" />,
});

export function LazyMap(props: { points: MapPoint[]; height?: number; label: string; userLocation?: { lat: number; lng: number } | null }) {
  return <Inner {...props} />;
}
