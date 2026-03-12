"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Install with one command",
    description:
      "Run a single command in your terminal. PrompyAI registers as an MCP server in Claude Code. No API keys needed for free scoring — just install and go.",
    detail: "Zero config, works immediately",
  },
  {
    number: "02",
    title: "Write any prompt",
    description:
      "Just use Claude Code like you normally do. PrompyAI automatically evaluates every prompt you send — scoring it across four dimensions: Specificity, Context, Clarity, and Anchoring.",
    detail: "Auto-evaluates every message",
  },
  {
    number: "03",
    title: "Get instant feedback",
    description:
      "See your score, dimension breakdown, actionable suggestions, and an AI-enhanced version of your prompt — all inline, right in your terminal. Copy the enhanced prompt or learn from the suggestions.",
    detail: "Score + suggestions + enhanced prompt",
  },
];

function StepRow({
  step,
}: {
  step: (typeof steps)[number];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="group grid lg:grid-cols-[80px_1fr_1fr] gap-8 lg:gap-12 py-10 lg:py-14 items-start border-b border-border/50 last:border-0"
    >
      <div className="w-20 flex-shrink-0">
        <p className="font-display text-6xl font-bold text-primary/20 leading-none transition-colors duration-500 group-hover:text-primary/40">
          {step.number}
        </p>
      </div>

      <div className="flex flex-col justify-start pt-1">
        <h3 className="font-display text-2xl lg:text-3xl font-semibold leading-tight mb-3 transition-colors duration-300 group-hover:text-primary">
          {step.title}
        </h3>
        <div className="flex items-center gap-2 mt-auto">
          <div className="h-px w-4 bg-primary flex-shrink-0" />
          <span className="text-xs text-primary font-medium tracking-wide">
            {step.detail}
          </span>
        </div>
      </div>

      <div className="lg:pt-1">
        <p className="text-base text-muted-foreground leading-relaxed">
          {step.description}
        </p>
      </div>
    </motion.div>
  );
}

export function HowItWorks() {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-80px" });

  return (
    <section id="how" className="relative bg-background py-32 overflow-hidden">
      <div className="container mx-auto max-w-7xl px-6">
        <div ref={headerRef} className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3 mb-6"
          >
            <div className="h-px w-8 bg-primary flex-shrink-0" />
            <span className="text-xs font-medium tracking-[0.2em] uppercase text-primary">
              How it works
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] max-w-2xl"
          >
            From install to{" "}
            <span className="italic text-primary">insight in seconds.</span>
          </motion.h2>
        </div>

        <div>
          {steps.map((step, i) => (
            <StepRow key={i} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
}
