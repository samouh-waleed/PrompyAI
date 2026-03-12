"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { MonitorSmartphone, Github, Users, BarChart3 } from "lucide-react";

const roadmapItems = [
  {
    icon: MonitorSmartphone,
    title: "VS Code Extension",
    description: "Real-time prompt scoring directly in your editor. Score prompts before sending them to any AI assistant.",
    status: "In development",
  },
  {
    icon: Github,
    title: "GitHub Copilot Integration",
    description: "Score and enhance prompts for GitHub Copilot Chat. Same intelligence, different interface.",
    status: "Planned",
  },
  {
    icon: Users,
    title: "Team Dashboards",
    description: "Track prompt quality across your engineering team. Identify patterns, share best practices, measure improvement.",
    status: "Planned",
  },
  {
    icon: BarChart3,
    title: "Prompt Analytics",
    description: "Historical scoring trends, most common suggestions, and personalized tips based on your prompt patterns.",
    status: "Planned",
  },
];

export function Roadmap() {
  const headerRef = useRef<HTMLDivElement>(null);
  const headerInView = useInView(headerRef, { once: true, margin: "-80px" });

  return (
    <section id="roadmap" className="relative bg-background py-32 overflow-hidden">
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
              Coming next
            </span>
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] max-w-2xl"
          >
            This is just the{" "}
            <span className="italic text-primary">beginning.</span>
          </motion.h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {roadmapItems.map((item, idx) => {
            const ref = useRef<HTMLDivElement>(null);
            const isInView = useInView(ref, { once: true, margin: "-60px" });

            return (
              <motion.div
                key={idx}
                ref={ref}
                initial={{ opacity: 0, y: 24 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, delay: idx * 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="group relative flex flex-col p-8 rounded-2xl border border-border bg-background hover:border-primary/30 transition-colors duration-500"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted/30 group-hover:border-primary/30 group-hover:bg-primary/5 transition-all duration-500">
                    <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" strokeWidth={1.5} />
                  </div>
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-medium tracking-wide uppercase"
                    style={{
                      border: item.status === "In development" ? "1px solid oklch(0.55 0.24 295 / 0.3)" : "1px solid var(--border)",
                      color: item.status === "In development" ? "oklch(0.65 0.2 295)" : "var(--muted-foreground)",
                      background: item.status === "In development" ? "oklch(0.55 0.24 295 / 0.08)" : "transparent",
                    }}
                  >
                    {item.status === "In development" && (
                      <span className="relative flex h-1.5 w-1.5 mr-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                      </span>
                    )}
                    {item.status}
                  </span>
                </div>

                <h3 className="font-display text-xl font-semibold mb-2.5 group-hover:text-primary transition-colors duration-300">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
