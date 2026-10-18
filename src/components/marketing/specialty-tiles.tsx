import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Photo } from "@/components/ui/photo";
import type { ViewContext } from "@/server/context";
import { SPECIALTY_PHOTO, startingPrice, type SpecialtySlug } from "./specialty-content";

export type SpecialtyTile = { id: string; slug: SpecialtySlug; name: string; shortDescription: string; startingFeeMinor: number };

/**
 * The four specialties as photo tiles: a round photo, the name, what it
 * covers and the starting price in the viewer's currency. On phones each tile
 * is a row; from sm they stand side by side.
 */
export function SpecialtyTiles({
  specs,
  ctx,
  href = (slug) => `/doctors?specialty=${slug}`,
  linkLabel,
}: {
  specs: SpecialtyTile[];
  ctx: ViewContext;
  href?: (slug: SpecialtySlug) => string;
  /** Text at the bottom of each tile. Defaults to "See doctors". */
  linkLabel?: string;
}) {
  const { t } = ctx;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {specs.map((s) => {
        const price = startingPrice(ctx, s.startingFeeMinor);
        return (
          <li key={s.id}>
            <Link
              href={href(s.slug)}
              className="card group flex h-full items-center gap-4 p-4 transition hover:border-primary sm:flex-col sm:p-6 sm:text-center"
            >
              <span className="relative block size-20 shrink-0 overflow-hidden rounded-full ring-4 ring-primary-soft sm:size-32">
                <Photo
                  photo={SPECIALTY_PHOTO[s.slug]}
                  alt=""
                  sizes="(min-width: 640px) 128px, 80px"
                  className="rounded-full"
                  imgClassName="transition-transform duration-300 group-hover:scale-105"
                />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1.5 sm:items-center">
                <span className="text-lg font-bold text-heading">{t(s.name)}</span>
                <span className="text-[0.9375rem] text-fg-muted">{t(s.shortDescription)}</span>
                <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 sm:justify-center">
                  {price ? <span className="rounded-full bg-primary-soft px-3 py-0.5 text-sm font-semibold text-primary-soft-fg">{price}</span> : null}
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    {linkLabel ?? t("See doctors")}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
