import Image from "next/image";
import { LOGOS } from "@/lib/assets";

export type KofKaNLogoAsset = "brandmark" | "navigation" | "primary";

type Props = {
  /** Which logo variant to render. */
  asset?: KofKaNLogoAsset;
  className?: string;
  /** Merged onto the inner `Image` (e.g. splash size overrides). */
  imageClassName?: string;
  priority?: boolean;
  /** Accessible label; empty alt for decorative use. */
  alt?: string;
};

const DIMENSIONS: Record<
  KofKaNLogoAsset,
  { width: number; height: number; className: string }
> = {
  brandmark: {
    width: 512,
    height: 512,
    className: "h-[7.5rem] w-[7.5rem] object-contain sm:h-36 sm:w-36",
  },
  navigation: {
    width: 640,
    height: 240,
    /** Applied to each `fill` image inside the fixed frame below. */
    className: "object-contain object-center",
  },
  primary: {
    width: 512,
    height: 640,
    className: "h-28 w-auto max-w-[200px] object-contain",
  },
};

/** Fixed slot for nav logos (height + width cap match original bar layout). */
const NAV_LOGO_FRAME =
  "relative h-[3.25rem] w-[min(200px,44vw)] shrink-0 overflow-visible sm:h-[3.25rem] sm:w-[min(200px,46vw)]";

/**
 * Renders logos.
 * - **navigation** — header slot (uses the same KofKaN logo image now).
 * - **brandmark** — square mark for favicon/splash.
 * - **primary** — larger lockup if needed.
 */
export function KofKaNLogo({
  asset = "navigation",
  className = "",
  imageClassName = "",
  priority = false,
  alt = "KofKaN Store",
}: Props) {
  const dim = DIMENSIONS[asset];
  const imgClass = [dim.className, imageClassName].filter(Boolean).join(" ");

  if (asset === "navigation") {
    return (
      <span className={`inline-flex shrink-0 items-center justify-center ${className}`}>
        <span className={NAV_LOGO_FRAME}>
          <Image
            src={LOGOS.navigation}
            alt={alt}
            fill
            className={imgClass}
            sizes="(max-width: 640px) 168px, 178px"
            priority={priority}
          />
        </span>
      </span>
    );
  }

  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${className}`}>
      <Image
        src={LOGOS[asset]}
        alt={alt}
        width={dim.width}
        height={dim.height}
        className={imgClass}
        priority={priority}
      />
    </span>
  );
}
