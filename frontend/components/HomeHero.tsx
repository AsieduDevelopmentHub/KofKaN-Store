"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

/** Hero portrait from `public/assets/icons/hero.png`. */
const HERO_MODEL_SRC = "/assets/icons/hero.png";

export function HomeHero() {
  return (
    <section
      className="relative min-h-[min(62vh,500px)] overflow-hidden"
      style={{ background: "var(--kofkan-hero-gradient)" }}
      aria-labelledby="hero-heading"
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-black/50 via-black/18 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-[22%] left-[8%] right-[8%] h-px bg-gradient-to-r from-transparent via-[#25cfee]/55 to-transparent opacity-90"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: "inset 0 0 100px rgba(0,0,0,0.38)" }}
      />

      <motion.div
        initial={{ opacity: 0, x: 28 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        className="pointer-events-none absolute bottom-0 right-[-8%] top-[6%] z-0 w-[78%] max-w-[300px] sm:right-[-4%] sm:max-w-[320px]"
      >
        <div
          className="relative h-full w-full"
          style={{
            maskImage: "linear-gradient(to right, transparent 0%, black 38%, black 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 38%, black 100%)",
          }}
        >
          <Image
            src={HERO_MODEL_SRC}
            alt=""
            fill
            className="object-cover object-[center_12%]"
            sizes="(max-width:430px) 78vw, 320px"
            priority
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#0a3650]/55 via-transparent to-transparent mix-blend-soft-light"
            aria-hidden
          />
        </div>
      </motion.div>

      <div className="relative z-[1] mx-auto flex min-h-[min(62vh,500px)] kofkan-storefront-max flex-col px-4 pb-8 pt-9 sm:px-5 sm:pt-10 md:px-6 lg:px-8">
        <div className="flex min-h-0 flex-1 items-center">
          <div className="flex max-w-[min(54%,240px)] shrink-0 flex-col pr-2 sm:max-w-[250px]">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
            >
              <h1
                id="hero-heading"
                className="font-serif font-semibold tracking-[0.02em] text-white"
              >
                <span className="block text-[1.95rem] leading-[1.06] sm:text-[2.2rem]">Build.</span>
                <span className="mt-1.5 block text-[1.95rem] leading-[1.06] sm:text-[2.2rem]">
                  Tinker.
                </span>
                <span className="mt-2.5 block text-[1.3rem] font-medium leading-[1.15] tracking-[0.08em] text-kofkan-hero-subtext sm:text-[1.5rem]">
                  Innovate.
                </span>
              </h1>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.5 }}
              className="mt-4 h-px w-14 bg-gradient-to-r from-kofkan-gold/90 via-kofkan-gold to-transparent origin-left sm:w-16"
              aria-hidden
            />

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.65 }}
              className="mt-3 font-sans text-[0.8125rem] leading-relaxed text-kofkan-hero-subtext sm:text-[0.875rem]"
            >
              Microcontrollers, sensors, motors, and prototyping gear — for makers, students, and engineers.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.75 }}
              className="mt-2.5 font-sans text-[0.625rem] font-medium uppercase tracking-[0.22em] text-white/55 sm:text-[0.6875rem]"
            >
              MCUs · Sensors · Motors · Power · Tools
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.9 }}
            >
              <Link
                href="/shop"
                className="kofkan-btn-gold kofkan-tap mt-5 inline-flex items-center justify-center rounded-[10px] px-6 py-3 text-small font-semibold text-white shadow-lg shadow-black/20"
              >
                Shop Now
              </Link>
            </motion.div>
          </div>

          <div className="min-w-0 flex-1" aria-hidden />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="pointer-events-none flex justify-center pb-1 pt-2"
          aria-hidden
        >
          <span className="inline-flex flex-col items-center gap-0.5 text-[0.625rem] font-medium uppercase tracking-[0.28em] text-white/40">
            <span>Explore</span>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="animate-bounce text-kofkan-gold/70"
              aria-hidden
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </motion.div>
      </div>
    </section>
  );
}
