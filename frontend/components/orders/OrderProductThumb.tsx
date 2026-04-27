"use client";

import { useCallback, useEffect, useState } from "react";
import { ORDER_IMAGE_PLACEHOLDER, resolveMediaUrl } from "@/lib/media-url";

type Props = {
  src: string | null | undefined;
  className?: string;
};

/**
 * Order/catalog thumbnails from the API often use hosts not listed in `next.config` `images.remotePatterns`.
 * Native `<img>` always loads in the browser; `onError` falls back to a known-good image.
 */
export function OrderProductThumb({ src, className }: Props) {
  const resolved = resolveMediaUrl(src);
  const [url, setUrl] = useState(resolved);

  useEffect(() => {
    setUrl(resolveMediaUrl(src));
  }, [src]);

  const onError = useCallback(() => {
    setUrl((u) => (u === ORDER_IMAGE_PLACEHOLDER ? u : ORDER_IMAGE_PLACEHOLDER));
  }, []);

  // Order images use arbitrary API hosts; next/image remotePatterns cannot cover every LAN/deploy URL.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className={className} loading="lazy" decoding="async" onError={onError} />;
}
