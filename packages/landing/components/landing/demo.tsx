"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const SCORE_OUTPUT = `PrompyAI Score: 82/100 (B)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Specificity    22/25  ████████████████████░░░░
  Context        20/25  ████████████████████░░░░
  Clarity        21/25  ████████████████████░░░░
  Anchoring      19/25  ███████████████████░░░░░

Suggestions:
  1. Add expected vs actual behavior
  2. Reference the specific error message
  3. Mention which test cases fail

Enhanced Prompt:
┌─────────────────────────────────────────┐
│ Fix the rate limiting bug in            │
│ src/utils/rateLimiter.ts — the daily    │
│ counter resets at local midnight instead │
│ of UTC. The per-machine check in        │
│ RateLimiter.check() should compare      │
│ against UTC day boundaries. Currently   │
│ requests after midnight local time      │
│ bypass the 100/day limit.               │
└─────────────────────────────────────────┘`;

export function Demo() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="demo" className="relative py-32 overflow-hidden" style={{ background: "#080808" }}>
      <div className="container mx-auto max-w-7xl px-6">
        <div ref={ref} className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="h-px w-8 flex-shrink-0" style={{ background: "oklch(0.55 0.24 295)" }} />
            <span className="text-xs font-medium tracking-[0.2em] uppercase" style={{ color: "oklch(0.72 0.2 295)" }}>
              See it in action
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] max-w-2xl"
            style={{ color: "rgba(255,255,255,0.96)" }}
          >
            What you see{" "}
            <span className="italic" style={{ color: "oklch(0.72 0.2 295)" }}>every time you prompt.</span>
          </motion.h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mx-auto"
        >
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              boxShadow: "0 0 80px -20px oklch(0.55 0.24 295 / 0.15)",
            }}
          >
            {/* Terminal header */}
            <div
              className="flex items-center gap-2 px-5 py-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
            >
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
                <div className="h-3 w-3 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
                <div className="h-3 w-3 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
              </div>
              <span className="ml-3 text-xs font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
                Claude Code — PrompyAI output
              </span>
            </div>

            {/* Terminal body */}
            <div className="p-6 overflow-x-auto">
              <pre className="font-mono text-sm leading-relaxed whitespace-pre" style={{ color: "rgba(255,255,255,0.65)" }}>
                {SCORE_OUTPUT}
              </pre>
            </div>
          </div>

          <p className="mt-6 text-center text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            This output appears automatically on every prompt. No extra steps needed.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
