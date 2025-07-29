import SignInSection from "@/components/landing/SignInSection";
import HeroSection from "@/components/landing/HeroSection";

export default function LandingPage() {
  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-gray-50">
      <HeroSection />
      <SignInSection />
    </div>
  );
}
