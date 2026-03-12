import type { Metadata } from "next";
import { DM_Sans, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://prompyai.com"),
  applicationName: "PrompyAI",
  title: {
    default: "PrompyAI — Score your prompts against your real codebase",
    template: "%s | PrompyAI",
  },
  description:
    "Context-aware prompt intelligence for Claude CLI. Scores your prompts, suggests improvements, and rewrites enhanced prompts — all grounded in your actual code.",
  keywords: [
    "mcp server",
    "claude code",
    "prompt scoring",
    "prompt engineering",
    "developer tools",
    "ai developer tools",
    "claude cli",
    "model context protocol",
    "code intelligence",
    "prompt optimization",
    "prompyai",
  ],
  category: "technology",
  authors: [{ name: "PrompyAI", url: "https://prompyai.com" }],
  creator: "PrompyAI",
  publisher: "PrompyAI",
  alternates: { canonical: "https://prompyai.com" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://prompyai.com",
    siteName: "PrompyAI",
    title: "PrompyAI — Score your prompts against your real codebase",
    description:
      "Context-aware prompt intelligence for Claude CLI. Scores your prompts, suggests improvements, and rewrites enhanced prompts.",
    images: [
      {
        url: "https://prompyai.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "PrompyAI — prompt intelligence for developers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PrompyAI — Score your prompts against your real codebase",
    description:
      "Context-aware prompt intelligence for Claude CLI. Scores your prompts, suggests improvements, and rewrites enhanced prompts.",
    images: ["https://prompyai.com/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={dmSans.variable} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased`}
      >
        <div className="relative flex min-h-screen flex-col">{children}</div>
      </body>
    </html>
  );
}
