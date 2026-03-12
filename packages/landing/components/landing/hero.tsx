"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Copy, Check, Terminal, Sparkles, Brain, Shield } from "lucide-react";
import { useState, useEffect, Fragment } from "react";

const DEMO_PROMPTS = [
  "fix the bug in the auth middleware",
  "refactor the scoring engine to use dependency injection",
  "add rate limiting to the API endpoints in server.ts",
  "update the HeuristicScorer to handle edge cases",
];

function InstallCommand() {
  const [copied, setCopied] = useState(false);
  const command = "claude mcp add prompyai -- npx prompyai-mcp serve";

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.85, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-2xl mx-auto"
    >
      <div
        className="p-px rounded-2xl"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.04) 45%, oklch(0.55 0.24 295 / 0.5) 100%)",
          boxShadow: "0 0 80px -20px oklch(0.55 0.24 295 / 0.4), 0 0 0 1px rgba(255,255,255,0.03)",
        }}
      >
        <div
          className="relative rounded-[calc(1rem-1px)] overflow-hidden"
          style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(32px)" }}
        >
          {/* Top shimmer */}
          <div
            className="absolute inset-x-0 top-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.24), transparent)" }}
          />
          {/* Bottom glow */}
          <div
            className="absolute inset-x-8 bottom-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, oklch(0.55 0.24 295 / 0.4), transparent)" }}
          />

          <div className="flex items-center gap-3 px-5 py-4">
            <Terminal className="h-4 w-4 shrink-0" style={{ color: "rgba(255,255,255,0.28)" }} />
            <code className="flex-1 min-w-0 text-sm font-mono truncate" style={{ color: "rgba(255,255,255,0.55)" }}>
              {command}
            </code>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium shrink-0 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: copied ? "oklch(0.6 0.18 145)" : "oklch(0.55 0.24 295)",
                boxShadow: `0 0 28px -4px ${copied ? "oklch(0.6 0.18 145 / 0.5)" : "oklch(0.55 0.24 295 / 0.5)"}, 0 2px 8px rgba(0,0,0,0.3)`,
              }}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FloatingCard({
  icon: Icon,
  label,
  sub,
  delay,
  floatDelay,
}: {
  icon: React.ElementType;
  label: string;
  sub: string;
  delay: number;
  floatDelay: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className="animate-float"
      style={{ animationDelay: floatDelay }}
    >
      <div
        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl select-none"
        style={{
          background: "rgba(255,255,255,0.055)",
          border: "1px solid rgba(255,255,255,0.09)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)",
        }}
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "oklch(0.55 0.24 295 / 0.15)", border: "1px solid oklch(0.55 0.24 295 / 0.25)" }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: "oklch(0.72 0.2 295)" }} />
        </div>
        <div>
          <p className="text-xs font-semibold leading-none" style={{ color: "rgba(255,255,255,0.8)" }}>{label}</p>
          <p className="text-[10px] mt-0.5 leading-none" style={{ color: "rgba(255,255,255,0.3)" }}>{sub}</p>
        </div>
      </div>
    </motion.div>
  );
}

const FLOATERS = [
  {
    id: "score",
    icon: Sparkles,
    label: "Score: 82/100",
    sub: "Specificity + Context + Clarity",
    position: "left-[4%] top-[38%]",
    delay: 1.0,
    floatDelay: "0s",
  },
  {
    id: "enhanced",
    icon: Brain,
    label: "Enhanced prompt ready",
    sub: "AI-powered rewrite",
    position: "right-[4%] top-[32%]",
    delay: 1.1,
    floatDelay: "-4s",
  },
  {
    id: "context",
    icon: Shield,
    label: "Session-aware",
    sub: "Reads your conversation history",
    position: "left-[7%] top-[60%]",
    delay: 1.2,
    floatDelay: "-8s",
  },
  {
    id: "symbols",
    icon: Terminal,
    label: "3 symbols verified",
    sub: "HeuristicScorer, evaluate, parse",
    position: "right-[6%] top-[58%]",
    delay: 1.3,
    floatDelay: "-12s",
  },
];

export function Hero() {
  return (
    <section
      className="relative min-h-screen overflow-hidden flex flex-col"
      style={{ background: "#080808", color: "white" }}
    >
      {/* Orbs */}
      <div
        className="absolute pointer-events-none animate-float"
        style={{
          top: "-15%", left: "-10%",
          width: 900, height: 900,
          background: "radial-gradient(circle, oklch(0.55 0.24 295 / 0.15) 0%, transparent 60%)",
          filter: "blur(40px)",
          animationDelay: "0s",
        }}
      />
      <div
        className="absolute pointer-events-none animate-float"
        style={{
          bottom: "0%", right: "-8%",
          width: 700, height: 700,
          background: "radial-gradient(circle, oklch(0.45 0.2 295 / 0.12) 0%, transparent 60%)",
          filter: "blur(50px)",
          animationDelay: "-6s",
        }}
      />

      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 60%, rgba(0,0,0,0.5) 100%)",
        }}
      />

      {/* Floating cards (desktop) */}
      <div className="hidden xl:block">
        {FLOATERS.map((f) => (
          <div key={f.id} className={`absolute ${f.position} z-20`}>
            <FloatingCard icon={f.icon} label={f.label} sub={f.sub} delay={f.delay} floatDelay={f.floatDelay} />
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 flex-1 pt-28 pb-16">

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <span
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium"
            style={{
              border: "1px solid oklch(0.55 0.24 295 / 0.4)",
              background: "oklch(0.55 0.24 295 / 0.1)",
              color: "oklch(0.78 0.18 295)",
            }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Now live on the MCP Registry
          </span>
        </motion.div>

        {/* Headline */}
        <div className="mb-12 max-w-4xl">
          <div className="overflow-hidden pb-2">
            <motion.h1
              initial={{ y: "110%" }}
              animate={{ y: 0 }}
              transition={{ duration: 1.0, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="font-display font-bold leading-[1.0] tracking-tight"
              style={{ fontSize: "clamp(2.5rem,7vw,5.5rem)", color: "rgba(255,255,255,0.96)" }}
            >
              Write better prompts.
            </motion.h1>
          </div>
          <div className="overflow-hidden pb-2">
            <motion.h1
              initial={{ y: "110%" }}
              animate={{ y: 0 }}
              transition={{ duration: 1.0, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="font-display font-bold italic leading-[1.0] tracking-tight"
              style={{ fontSize: "clamp(2rem,6vw,4.5rem)", color: "oklch(0.72 0.2 295)" }}
            >
              Ship faster code.
            </motion.h1>
          </div>
        </div>

        {/* Install command */}
        <InstallCommand />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-8 text-sm max-w-lg leading-relaxed"
          style={{ color: "rgba(255,255,255,0.36)" }}
        >
          One command. Zero config. PrompyAI scores every prompt you write against your real codebase — file paths, symbols, session context — and suggests how to make it better.
        </motion.p>

        {/* Proof stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 1.1 }}
          className="mt-12 flex items-center justify-center gap-px flex-wrap"
        >
          {[
            { value: "4", label: "scoring dimensions" },
            { value: "20+", label: "heuristic rules" },
            { value: "0ms", label: "added latency" },
            { value: "Free", label: "to start" },
          ].map((s, i, arr) => (
            <Fragment key={s.label}>
              <div className="px-6 py-2 text-center">
                <p className="font-display font-bold text-lg" style={{ color: "rgba(255,255,255,0.88)" }}>{s.value}</p>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>{s.label}</p>
              </div>
              {i < arr.length - 1 && (
                <div className="w-px h-8 self-center" style={{ background: "rgba(255,255,255,0.08)" }} />
              )}
            </Fragment>
          ))}
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 inset-x-0 h-32 pointer-events-none z-10"
        style={{ background: "linear-gradient(to top, #080808, transparent)" }}
      />
    </section>
  );
}
