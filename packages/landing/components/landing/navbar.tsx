"use client";

import { Menu, X, ArrowRight, Github } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import { cn } from "@/lib/utils";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 40);
  });

  const navLinks = [
    { name: "How it works", href: "#how" },
    { name: "Features", href: "#features" },
    { name: "Demo", href: "#demo" },
    { name: "Roadmap", href: "#roadmap" },
  ];

  return (
    <>
      <header
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-500",
          scrolled
            ? "bg-background/96 backdrop-blur-md border-b border-border/40"
            : "",
        )}
      >
        <div className="container mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-2.5 w-2.5 rounded-full bg-primary flex-shrink-0" />
            <span className={cn(
              "font-bold text-xl tracking-tight transition-colors duration-500",
              scrolled || isOpen ? "text-foreground" : "text-white",
            )}>
              PrompyAI
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className={cn(
                  "px-4 py-2 text-sm transition-colors duration-500 rounded-lg",
                  scrolled
                    ? "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    : "text-white/60 hover:text-white hover:bg-white/8",
                )}
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="https://github.com/samouh-waleed/PrompyAI"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm transition-colors duration-500 rounded-lg",
                scrolled
                  ? "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  : "text-white/60 hover:text-white hover:bg-white/8",
              )}
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
            <motion.a
              href="#install"
              className="inline-flex h-9 items-center gap-1.5 px-5 rounded-xl text-sm font-medium transition-all bg-primary text-white hover:bg-primary/90"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Get started
              <ArrowRight className="h-3.5 w-3.5" />
            </motion.a>
          </div>

          {/* Mobile trigger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "md:hidden flex items-center justify-center w-9 h-9 rounded-xl transition-colors",
              scrolled || isOpen ? "hover:bg-muted/50 text-foreground" : "hover:bg-white/10 text-white",
            )}
            aria-label="Toggle menu"
          >
            <AnimatePresence mode="wait">
              {isOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="h-5 w-5" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu className="h-5 w-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-40 bg-background md:hidden flex flex-col pt-20 px-6"
          >
            <div className="flex flex-col">
              {navLinks.map((link, i) => (
                <motion.a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08, duration: 0.3 }}
                  className="flex items-center justify-between py-5 border-b border-border/40 group"
                >
                  <span className="text-xl font-semibold">{link.name}</span>
                </motion.a>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="mt-8 flex flex-col gap-3"
            >
              <a
                href="#install"
                onClick={() => setIsOpen(false)}
                className="flex h-14 w-full items-center justify-center rounded-2xl bg-primary text-white font-medium text-base"
              >
                Get started
              </a>
              <a
                href="https://github.com/samouh-waleed/PrompyAI"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border text-sm text-muted-foreground"
              >
                <Github className="h-4 w-4" />
                View on GitHub
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
