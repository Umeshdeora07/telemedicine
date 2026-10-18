"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { PHOTOS, type PhotoName, type SitePhoto } from "@/config/images";
import { cn } from "@/lib/utils";

/**
 * A site photo that fills its parent. The parent sets the size or aspect ratio
 * (for example `className="aspect-[4/3] rounded-2xl"` here, or on a wrapper).
 * If the picture cannot load, a soft gradient tile with a small icon is shown
 * instead of a broken image.
 *
 * `alt`: pass the translated text, e.g. alt={t(PHOTOS.support.alt)}; pass ""
 * when the photo is decorative. Defaults to the English alt text.
 */
export function Photo({
  photo,
  alt,
  sizes = "100vw",
  preload = false,
  className,
  imgClassName,
}: {
  photo: SitePhoto | PhotoName;
  alt?: string;
  sizes?: string;
  /** For the main photo above the fold (largest contentful paint). */
  preload?: boolean;
  className?: string;
  imgClassName?: string;
}) {
  const p = typeof photo === "string" ? PHOTOS[photo] : photo;
  const text = alt ?? p.alt;
  const [failed, setFailed] = useState(false);
  return (
    <span className={cn("relative block size-full overflow-hidden bg-primary-soft", className)}>
      {failed ? (
        <span
          role={text ? "img" : undefined}
          aria-label={text || undefined}
          aria-hidden={text ? undefined : true}
          className="absolute inset-0 grid place-items-center bg-gradient-to-br from-primary-soft via-surface-2 to-primary-soft"
        >
          <ImageIcon className="size-10 text-primary opacity-30" aria-hidden />
        </span>
      ) : (
        <Image
          src={p.src}
          alt={text}
          fill
          sizes={sizes}
          preload={preload}
          onError={() => setFailed(true)}
          // An image that failed before the page became interactive never fires onError.
          ref={(img) => {
            if (img?.complete && img.naturalWidth === 0) setFailed(true);
          }}
          className={cn("object-cover", imgClassName)}
        />
      )}
    </span>
  );
}
