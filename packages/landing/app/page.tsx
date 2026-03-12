import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { Demo } from "@/components/landing/demo";
import { Roadmap } from "@/components/landing/roadmap-section";
import { InstallCTA } from "@/components/landing/install-cta";
import { Footer } from "@/components/landing/footer";

export default function Page() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Features />
        <Demo />
        <Roadmap />
        <InstallCTA />
      </main>
      <Footer />
    </div>
  );
}
