"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/** First four promotional banners (`banner5.png` and beyond are omitted). */
const SLIDES: { src: string; alt: string }[] = [
  {
    src: "/assets/banners/banner1.png",
    alt: "KofKaN — embedded systems, robotics, and programming gear",
  },
  {
    src: "/assets/banners/banner2.png",
    alt: "Featured kits — microcontrollers, sensors, motors, and prototyping tools",
  },
  {
    src: "/assets/banners/banner3.png",
    alt: "Build smarter projects with quality components",
  },
  {
    src: "/assets/banners/banner4.png",
    alt: "Starter packs and project bundles",
  },
];

const AUTO_MS = 5500;
const SWIPE_MIN_PX = 48;

type Props = {
  /** `featured` = top of #featured (inset, no full-bleed band). `full` = standalone section width. */
  variant?: "full" | "featured";
};

export function HomeBannerSlideshow({ variant = "full" }: Props) {
  const [index, setIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchActive = useRef(false);
  /** Prevents accidental "pause" click right after a horizontal swipe. */
  const ignoreClickAfterSwipe = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion || paused) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [reducedMotion, paused]);

  const goPrev = () => {
    setPaused(true);
    setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length);
  };

  const goNext = () => {
    setPaused(true);
    setIndex((i) => (i + 1) % SLIDES.length);
  };

  const slideTransition = reducedMotion ? "" : "transition-opacity duration-700 ease-in-out";

  const shell =
    variant === "featured"
      ? "bg-transparent px-4 pb-5 pt-2 dark:bg-transparent"
      : "border-b border-black/[0.06] bg-kofkan-cream px-4 py-6 dark:border-white/10 dark:bg-zinc-950 sm:px-5";

  return (
    <div
      className={shell}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured banners"
    >
      <div className="kofkan-storefront-max relative w-full">
        <div className="relative">
          <div
            className="relative aspect-[16/10] w-full bg-zinc-200 dark:bg-zinc-800"
            onTouchStart={(e) => {
              if (e.touches.length !== 1) return;
              touchStartX.current = e.touches[0].clientX;
              touchActive.current = true;
            }}
            onTouchEnd={(e) => {
              if (!touchActive.current || touchStartX.current === null) {
                touchStartX.current = null;
                touchActive.current = false;
                return;
              }
              const endX = e.changedTouches[0]?.clientX;
              if (endX === undefined) {
                touchStartX.current = null;
                touchActive.current = false;
                return;
              }
              const dx = endX - touchStartX.current;
              touchStartX.current = null;
              touchActive.current = false;
              if (Math.abs(dx) < SWIPE_MIN_PX) return;
              ignoreClickAfterSwipe.current = true;
              window.setTimeout(() => {
                ignoreClickAfterSwipe.current = false;
              }, 350);
              if (dx > 0) goPrev();
              else goNext();
            }}
            onTouchCancel={() => {
              touchStartX.current = null;
              touchActive.current = false;
            }}
          >
            {/* Inset frame so banners do not flush to the outer rounded container */}
            <div className="pointer-events-none absolute inset-3 overflow-hidden rounded-[10px] sm:inset-4">
              {SLIDES.map((slide, i) => (
                <div
                  key={slide.src}
                  className={`pointer-events-none absolute inset-0 ${slideTransition} ${
                    i === index ? "z-[1] opacity-100" : "z-0 opacity-0"
                  }`}
                  aria-hidden={i !== index}
                >
                  <Image
                    src={slide.src}
                    alt=""
                    fill
                    className="rounded-[5px] object-contain object-center"
                    sizes="(max-width: 480px) 100vw, 430px"
                    priority={i === 0}
                  />
                </div>
              ))}
            </div>

            {/* Tap target: pause autoplay only; sits above images for pointer events */}
            <button
              type="button"
              className="absolute inset-3 z-[1] cursor-default rounded-[5px] sm:inset-4"
              aria-label={`${SLIDES[index]?.alt ?? "Banner"}. Slide ${index + 1} of ${SLIDES.length}. Tap to pause slideshow.`}
              onClick={() => {
                if (ignoreClickAfterSwipe.current) return;
                setPaused(true);
              }}
            />

            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-black/[0.03]"
              aria-hidden
            />
          </div>

          <button
            type="button"
            className="kofkan-tap-static absolute left-2 top-1/2 z-[2] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-kofkan-text-primary shadow-md backdrop-blur-sm hover:bg-white dark:bg-zinc-900/90 dark:text-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Previous banner"
            onClick={goPrev}
          >
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            className="kofkan-tap-static absolute right-2 top-1/2 z-[2] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-kofkan-text-primary shadow-md backdrop-blur-sm hover:bg-white dark:bg-zinc-900/90 dark:text-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Next banner"
            onClick={goNext}
          >
            <Chevron dir="right" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2" role="tablist" aria-label="Banner slides">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              className={`kofkan-tap-static h-2 rounded-full ${
                i === index ? "w-6 bg-kofkan-gold" : "w-2 bg-kofkan-gray-soft dark:bg-zinc-600"
              }`}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => {
                setPaused(true);
                setIndex(i);
              }}
            />
          ))}
        </div>

        <p className="mt-2 text-center text-[11px] font-medium uppercase tracking-[0.2em] text-kofkan-text-muted dark:text-zinc-500">
          Swipe or use arrows · tap banner to pause
        </p>
      </div>
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={dir === "left" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
