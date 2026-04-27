"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const HERO_VISUAL =
  "https://images.unsplash.com/photo-1766596796538-75b67ff9109c?auto=format&fit=crop&w=1600&q=80";

export function HomeHero() {
  return (
    <section
      className="kofkan-circuit-grid relative min-h-[min(62vh,500px)] overflow-hidden"
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
        className="pointer-events-none absolute bottom-[-18%] right-[-18%] top-[8%] z-0 w-[86%] max-w-[420px] sm:right-[-12%] sm:max-w-[460px]"
        aria-hidden
      >
        <div className="relative h-full w-full">
          <div className="absolute inset-[12%] overflow-hidden rounded-[34px] border border-white/10 bg-black/10">
            <Image
              src={HERO_VISUAL}
              alt=""
              fill
              priority
              className="object-cover opacity-[0.92]"
              sizes="(max-width: 640px) 70vw, 460px"
            />
            <div
              className="absolute inset-0 bg-gradient-to-br from-black/30 via-black/10 to-black/40"
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(0,184,217,0.26),transparent_46%),radial-gradient(circle_at_86%_30%,rgba(125,82,255,0.18),transparent_52%)]"
              aria-hidden
            />
          </div>
          <div className="absolute inset-0 rounded-[38px] bg-gradient-to-br from-[#00d4ff]/18 via-transparent to-[#7d52ff]/18 blur-[2px]" />
          <div className="absolute inset-[10%] rounded-[34px] border border-white/10 bg-black/10 shadow-[0_0_0_1px_rgba(0,184,217,0.18),0_24px_60px_rgba(0,0,0,0.38)]" />
          <div className="absolute inset-[18%] rounded-[28px] border border-white/10 bg-gradient-to-b from-white/10 to-transparent" />
          <div className="absolute left-[18%] top-[22%] h-2 w-2 rounded-full bg-kofkan-cyan shadow-[0_0_0_6px_rgba(0,184,217,0.12)]" />
          <div className="absolute left-[62%] top-[18%] h-2 w-2 rounded-full bg-kofkan-accent shadow-[0_0_0_6px_rgba(125,82,255,0.12)]" />
          <div className="absolute left-[32%] top-[58%] h-2 w-2 rounded-full bg-white/70 shadow-[0_0_0_6px_rgba(255,255,255,0.06)]" />
          <div className="absolute inset-0 rounded-[38px] bg-[radial-gradient(circle_at_20%_20%,rgba(0,184,217,0.24),transparent_38%),radial-gradient(circle_at_80%_25%,rgba(125,82,255,0.18),transparent_44%)]" />
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
                className="font-mono font-semibold tracking-[0.04em] text-white"
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
              className="mt-4 h-px w-14 bg-gradient-to-r from-kofkan-cyan/90 via-kofkan-cyan to-transparent origin-left sm:w-16"
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
              className="animate-bounce text-kofkan-cyan/70"
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
