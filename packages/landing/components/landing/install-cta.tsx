"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Copy, Check, Terminal, ArrowRight } from "lucide-react";

export function InstallCTA() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [copied, setCopied] = useState(false);
  const command = "claude mcp add prompyai -- npx prompyai-mcp serve";

  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="install" className="relative py-32 overflow-hidden" style={{ background: "#080808" }}>
      {/* Purple glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 800, height: 800,
          background: "radial-gradient(circle, oklch(0.55 0.24 295 / 0.12) 0%, transparent 60%)",
          filter: "blur(60px)",
        }}
      />

      <div ref={ref} className="container relative z-10 mx-auto max-w-3xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <h2
            className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6"
            style={{ color: "rgba(255,255,255,0.96)" }}
          >
            Ready to write{" "}
            <span className="italic" style={{ color: "oklch(0.72 0.2 295)" }}>better prompts?</span>
          </h2>
          <p className="text-base mb-12 max-w-lg mx-auto" style={{ color: "rgba(255,255,255,0.4)" }}>
            One command. No sign-up. No API key needed. Free heuristic scoring works immediately.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          {/* Install command */}
          <div
            className="p-px rounded-2xl mb-8"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.03) 45%, oklch(0.55 0.24 295 / 0.4) 100%)",
              boxShadow: "0 0 80px -20px oklch(0.55 0.24 295 / 0.3)",
            }}
          >
            <div
              className="relative rounded-[calc(1rem-1px)] overflow-hidden"
              style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(32px)" }}
            >
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
                    boxShadow: `0 0 28px -4px ${copied ? "oklch(0.6 0.18 145 / 0.5)" : "oklch(0.55 0.24 295 / 0.5)"}`,
                  }}
                >
                  {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                </button>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <a
              href="https://www.npmjs.com/package/prompyai-mcp"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm transition-colors"
              style={{ color: "rgba(255,255,255,0.4)" }}
              onMouseOver={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.8)"}
              onMouseOut={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}
            >
              npm package
              <ArrowRight className="h-3 w-3" />
            </a>
            <a
              href="https://github.com/samouh-waleed/PrompyAI"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm transition-colors"
              style={{ color: "rgba(255,255,255,0.4)" }}
              onMouseOver={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.8)"}
              onMouseOut={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}
            >
              GitHub
              <ArrowRight className="h-3 w-3" />
            </a>
            <a
              href="https://registry.modelcontextprotocol.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm transition-colors"
              style={{ color: "rgba(255,255,255,0.4)" }}
              onMouseOver={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.8)"}
              onMouseOut={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.4)"}
            >
              MCP Registry
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
