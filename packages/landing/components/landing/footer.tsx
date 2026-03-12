"use client";

import Link from "next/link";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";

const navColumns = [
  {
    title: "Product",
    links: [
      { title: "How it works", href: "#how" },
      { title: "Features", href: "#features" },
      { title: "Demo", href: "#demo" },
      { title: "Roadmap", href: "#roadmap" },
    ],
  },
  {
    title: "Resources",
    links: [
      { title: "npm package", href: "https://www.npmjs.com/package/prompyai-mcp" },
      { title: "GitHub", href: "https://github.com/samouh-waleed/PrompyAI" },
      { title: "MCP Registry", href: "https://registry.modelcontextprotocol.io" },
    ],
  },
];

export function Footer() {
  const containerRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end end"],
  });

  const yReveal = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ["0%", "0%"] : ["50%", "0%"],
  );
  const opacityReveal = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    prefersReducedMotion ? [1, 1, 1] : [0, 0.15, 1],
  );
  const scaleReveal = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? [1, 1] : [0.88, 1],
  );

  return (
    <footer
      ref={containerRef}
      className="relative flex min-h-[60vh] flex-col justify-between overflow-hidden bg-foreground pt-24 text-background"
    >
      {/* Shimmer top rule */}
      <div className="absolute left-0 right-0 top-0 h-px bg-background/8 overflow-hidden">
        <motion.div
          className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent"
          animate={{ x: ["-100%", "350%"] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="container relative z-10 mx-auto max-w-7xl px-6">
        <div className="flex w-full flex-col gap-16 lg:flex-row lg:justify-between pt-2">
          {/* Brand block */}
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5 mb-6">
              <div className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0" />
              <span className="font-bold text-xl text-background">PrompyAI</span>
            </div>
            <p className="text-base text-background/70 leading-relaxed mb-4">
              Context-aware prompt intelligence for Claude CLI.
            </p>
            <p className="text-xs text-background/35 leading-relaxed">
              Scores your prompts against your real codebase. Free to use, open source, and built for developers.
            </p>
          </div>

          {/* Sitemap */}
          <div className="flex flex-col gap-10 sm:flex-row sm:gap-20">
            {navColumns.map((section) => (
              <div key={section.title}>
                <h4 className="mb-5 text-[10px] uppercase tracking-[0.2em] text-background/30 font-medium">
                  {section.title}
                </h4>
                <ul className="flex flex-col gap-3.5">
                  {section.links.map((link) => (
                    <li key={link.title}>
                      {link.href.startsWith("http") ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-2.5 text-sm text-background/55 hover:text-background transition-colors duration-200"
                        >
                          <span className="h-px w-0 bg-primary transition-all duration-300 group-hover:w-4 flex-shrink-0" />
                          {link.title}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          className="group flex items-center gap-2.5 text-sm text-background/55 hover:text-background transition-colors duration-200"
                        >
                          <span className="h-px w-0 bg-primary transition-all duration-300 group-hover:w-4 flex-shrink-0" />
                          {link.title}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Large scroll-revealed wordmark */}
      <div className="relative mt-20 flex w-full flex-col items-center overflow-hidden px-4 pb-6">
        <motion.div
          style={{ y: yReveal, opacity: opacityReveal, scale: scaleReveal }}
          className="w-full text-center"
        >
          <h1 className="select-none font-display bg-gradient-to-b from-background/25 via-background/10 to-transparent bg-clip-text text-[18vw] font-bold leading-[0.85] tracking-tighter text-transparent">
            PrompyAI
          </h1>
        </motion.div>

        {/* Bottom bar */}
        <div className="relative z-10 mt-12 flex w-full flex-col items-center justify-between gap-4 border-t border-background/10 pt-5 text-[10px] uppercase tracking-[0.15em] text-background/35 sm:flex-row sm:gap-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-primary">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Live
            </span>
            <span className="hidden sm:block text-background/15">|</span>
            <span>&copy; {new Date().getFullYear()} PrompyAI</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="https://github.com/samouh-waleed/PrompyAI" target="_blank" rel="noopener noreferrer" className="hover:text-background transition-colors">
              GitHub
            </a>
            <a href="https://www.npmjs.com/package/prompyai-mcp" target="_blank" rel="noopener noreferrer" className="hover:text-background transition-colors">
              npm
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
