"use client";

import { useRef } from "react";
import { Target, Brain, MessageSquare, Settings } from "lucide-react";
import { motion, useInView } from "framer-motion";

const features = [
  {
    number: "01",
    icon: Target,
    title: "Context-Aware Scoring",
    description:
      "Every prompt is scored against your actual codebase — file paths, tech stack, dependencies, and symbols. Not generic advice. Real, grounded feedback.",
    items: [
      "4 dimensions: Specificity, Context, Clarity, Anchoring",
      "20+ heuristic rules tuned for developer prompts",
      "Verified symbol references via TypeScript compiler API",
      "Monorepo-aware stack detection",
      "File relevance weighting based on your project structure",
      "Scores from 0-100 with letter grades (A-F)",
    ],
    color: "from-primary/8 to-transparent",
  },
  {
    number: "02",
    icon: Brain,
    title: "AI-Enhanced Prompts",
    description:
      "Get a rewritten version of your prompt that scores higher — injected with real file paths, verified symbols, and structured context from your project.",
    items: [
      "Claude Haiku-powered suggestions with project context",
      "Smart template fallback when no API key is set",
      "Injects real file paths and verified code symbols",
      "Deduplication guards prevent repeated suggestions",
      "Copy-paste ready enhanced prompt in every response",
    ],
    color: "from-primary/5 to-transparent",
  },
  {
    number: "03",
    icon: MessageSquare,
    title: "Session Intelligence",
    description:
      "PrompyAI reads your Claude Code conversation history to understand what you've been working on. Recent files, topics, and context enrich every score.",
    items: [
      "Auto-detects active Claude Code session",
      "Reads recent conversation for file references",
      "Multi-agent and subagent awareness",
      "Session context enriches scoring without manual input",
      "Respects conversation flow and recent decisions",
    ],
    color: "from-primary/8 to-transparent",
  },
  {
    number: "04",
    icon: Settings,
    title: "Zero Config",
    description:
      "One command to install. Auto-evaluates every message. Toggle on/off with natural language. No API keys needed for free heuristic scoring.",
    items: [
      "Works immediately after install — no setup needed",
      "Auto-evaluation on every prompt (toggle with prompyai_toggle)",
      "Free heuristic scoring without any API key",
      "Optional Anthropic key unlocks AI-powered suggestions",
      "Rate limiting protects your API budget automatically",
    ],
    color: "from-primary/5 to-transparent",
  },
];

function FeatureCard({ feature }: { feature: (typeof features)[number] }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-background hover:border-primary/30 transition-colors duration-500"
    >
      <div className={`absolute inset-0 bg-gradient-to-b ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

      <div className="relative p-8 pb-6 border-b border-border/50">
        <div className="flex items-start justify-between gap-4 mb-4">
          <span className="font-display font-bold text-4xl text-primary/20 leading-none group-hover:text-primary/35 transition-colors duration-500">
            {feature.number}
          </span>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/30 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all duration-500">
            <feature.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" strokeWidth={1.5} />
          </div>
        </div>
        <h3 className="font-display text-xl font-semibold mb-2.5 group-hover:text-primary transition-colors duration-300">
          {feature.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {feature.description}
        </p>
      </div>

      <div className="relative flex-1 p-8">
        <ul className="space-y-2.5">
          {feature.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-3 group/item">
              <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/40 flex-shrink-0 group-hover/item:bg-primary transition-colors duration-300" />
              <span className="text-sm text-muted-foreground leading-snug group-hover/item:text-foreground transition-colors duration-200">
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

export function Features() {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-80px" });

  return (
    <section id="features" className="relative bg-background py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--color-border)_1px,transparent_1px)] bg-[size:28px_28px] opacity-25 pointer-events-none" />

      <div className="container relative z-10 mx-auto max-w-7xl px-6">
        <div ref={headerRef} className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            className="flex items-center gap-3 mb-6"
          >
            <div className="h-px w-8 bg-primary flex-shrink-0" />
            <span className="text-xs font-medium tracking-[0.2em] uppercase text-primary">
              Features
            </span>
          </motion.div>
          <div className="grid lg:grid-cols-2 gap-8 items-end">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={headerInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1]"
            >
              Prompt intelligence,{" "}
              <span className="italic text-primary">grounded in your code.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={headerInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base text-muted-foreground leading-relaxed lg:max-w-sm lg:ml-auto"
            >
              Not another generic prompt tips tool. PrompyAI understands your project structure, your code symbols, and your conversation context.
            </motion.p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, idx) => (
            <FeatureCard key={idx} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
