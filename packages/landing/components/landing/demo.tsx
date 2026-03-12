"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

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
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] max-w-3xl"
            style={{ color: "rgba(255,255,255,0.96)" }}
          >
            From vague prompt to{" "}
            <span className="italic" style={{ color: "oklch(0.72 0.2 295)" }}>grounded context.</span>
          </motion.h2>
        </div>

        {/* Two-panel demo */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto"
        >
          {/* LEFT: User's original prompt */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.35)" }}>
                Your prompt
              </span>
            </div>
            <div
              className="rounded-2xl overflow-hidden h-full"
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div
                className="flex items-center gap-2 px-5 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
              >
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
                </div>
                <span className="ml-2 text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
                  Claude Code
                </span>
              </div>
              <div className="p-6">
                <p className="font-mono text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                  <span style={{ color: "oklch(0.72 0.2 295)" }}>$</span>{" "}
                  fix the auth bug, users can&apos;t log in after the last deploy
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: PrompyAI enhanced output */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full" style={{ background: "oklch(0.55 0.24 295)" }} />
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "oklch(0.72 0.2 295)" }}>
                PrompyAI enhanced
              </span>
            </div>
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                border: "1px solid oklch(0.55 0.24 295 / 0.2)",
                background: "rgba(255,255,255,0.03)",
                boxShadow: "0 0 60px -20px oklch(0.55 0.24 295 / 0.12)",
              }}
            >
              <div
                className="flex items-center gap-2 px-5 py-3"
                style={{ borderBottom: "1px solid oklch(0.55 0.24 295 / 0.1)", background: "oklch(0.55 0.24 295 / 0.03)" }}
              >
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: "oklch(0.55 0.24 295 / 0.3)" }} />
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: "oklch(0.55 0.24 295 / 0.2)" }} />
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: "oklch(0.55 0.24 295 / 0.15)" }} />
                </div>
                <span className="ml-2 text-[11px] font-mono" style={{ color: "oklch(0.72 0.2 295 / 0.6)" }}>
                  PrompyAI output
                </span>
              </div>
              <div className="p-6 space-y-5">
                {/* Score header */}
                <div>
                  <div className="flex items-baseline gap-3 mb-3">
                    <span className="font-mono text-2xl font-bold" style={{ color: "oklch(0.72 0.2 295)" }}>47</span>
                    <span className="font-mono text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>/100</span>
                    <span
                      className="ml-1 px-2 py-0.5 rounded text-[10px] font-bold"
                      style={{ background: "oklch(0.65 0.2 50 / 0.15)", color: "oklch(0.8 0.15 50)" }}
                    >
                      D
                    </span>
                  </div>
                  {/* Score bars */}
                  <div className="space-y-1.5">
                    {[
                      { name: "Specificity", score: 10, max: 25 },
                      { name: "Context", score: 8, max: 25 },
                      { name: "Clarity", score: 16, max: 25 },
                      { name: "Anchoring", score: 13, max: 25 },
                    ].map((d) => (
                      <div key={d.name} className="flex items-center gap-3">
                        <span className="text-[11px] font-mono w-20 text-right" style={{ color: "rgba(255,255,255,0.35)" }}>
                          {d.name}
                        </span>
                        <span className="text-[11px] font-mono w-8" style={{ color: "rgba(255,255,255,0.5)" }}>
                          {d.score}/{d.max}
                        </span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(d.score / d.max) * 100}%`,
                              background: `linear-gradient(90deg, oklch(0.55 0.24 295), oklch(0.65 0.2 295))`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

                {/* Suggestions */}
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: "oklch(0.72 0.2 295 / 0.6)" }}>
                    Suggestions
                  </p>
                  <div className="space-y-1.5">
                    {[
                      "Reference the auth file: src/middleware/auth.ts",
                      "Mention the specific error users see",
                      "Include which deploy commit broke it",
                    ].map((s, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="font-mono text-[11px] mt-px" style={{ color: "oklch(0.72 0.2 295 / 0.5)" }}>{i + 1}.</span>
                        <span className="font-mono text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

                {/* Enhanced prompt */}
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider mb-3" style={{ color: "oklch(0.72 0.2 295 / 0.6)" }}>
                    Enhanced prompt
                  </p>
                  <div
                    className="rounded-xl p-4"
                    style={{
                      background: "oklch(0.55 0.24 295 / 0.05)",
                      border: "1px solid oklch(0.55 0.24 295 / 0.12)",
                    }}
                  >
                    <p className="font-mono text-[12px] leading-[1.7]" style={{ color: "rgba(255,255,255,0.65)" }}>
                      Fix the authentication bug in{" "}
                      <span style={{ color: "oklch(0.72 0.2 295)" }}>@src/middleware/auth.ts</span>
                      {" "}&mdash; users are getting 401 errors after the latest deploy.
                      <br /><br />
                      The{" "}
                      <span style={{ color: "oklch(0.78 0.15 200)" }}>validateSession()</span>
                      {" "}function appears to reject valid JWT tokens. Check the token
                      expiry logic against the{" "}
                      <span style={{ color: "oklch(0.72 0.2 295)" }}>@src/config/auth.config.ts</span>
                      {" "}settings.
                      <br /><br />
                      Refer to{" "}
                      <span style={{ color: "oklch(0.72 0.2 295)" }}>CLAUDE.md</span>
                      {" "}for session handling patterns.
                      <br /><br />
                      <span style={{ color: "rgba(255,255,255,0.3)" }}>
                        Expected: Users authenticate successfully with valid credentials.
                        <br />
                        Current: All login attempts return 401 Unauthorized since commit #a3f9c2.
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-8 text-center text-sm"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          Same intent. Better context. PrompyAI adds file paths, verified symbols, and structured details automatically.
        </motion.p>
      </div>
    </section>
  );
}
