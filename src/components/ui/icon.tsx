import {
  Baby,
  Bone,
  Brain,
  Droplet,
  Flower2,
  HeartPulse,
  ScanFace,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  baby: Baby,
  "flower-2": Flower2,
  "scan-face": ScanFace,
  "heart-pulse": HeartPulse,
  bone: Bone,
  brain: Brain,
  droplet: Droplet,
};

export function SpecialtyIcon({ name, className }: { name: string; className?: string }) {
  const I = ICONS[name] ?? Stethoscope;
  return <I className={className} aria-hidden />;
}
