import { Button } from "@/components/ui/button";
import { BarChart2, Clock, LogIn, Shield } from "lucide-react";
import React from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function LoginScreen() {
  const { login, isLoggingIn } = useInternetIdentity();

  const handleLogin = () => {
    try {
      login();
    } catch (error: unknown) {
      console.error("Login error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 dark:opacity-10"
          style={{
            backgroundImage:
              "url('/assets/generated/hero-welcome.dim_1200x800.png')",
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />

        <div className="relative z-10 flex flex-col items-center px-6 pt-16 pb-8 text-center max-w-sm mx-auto">
          {/* App Icon */}
          <div className="mb-6 relative">
            <div className="w-24 h-24 rounded-3xl shadow-elevated overflow-hidden">
              <img
                src="/assets/generated/swipetrack-icon.dim_256x256.png"
                alt="SwipeTrack Pro"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-glow">
              <Clock className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>

          <h1 className="text-4xl font-display font-bold text-foreground mb-2 tracking-tight">
            SwipeTrack Pro
          </h1>
          <p className="text-muted-foreground text-base mb-10 leading-relaxed">
            Smart office attendance tracking with automatic hour calculations
          </p>

          {/* Feature highlights */}
          <div className="w-full space-y-3 mb-10">
            {[
              { icon: Clock, text: "Automatic working hour calculations" },
              { icon: BarChart2, text: "Weekly & monthly analytics" },
              { icon: Shield, text: "Secure cloud sync & backup" },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-center gap-3 bg-card/80 backdrop-blur-sm rounded-xl px-4 py-3 border border-border/50"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground text-left">
                  {text}
                </span>
              </div>
            ))}
          </div>

          {/* Login Button */}
          <Button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full h-14 text-base font-semibold rounded-2xl shadow-glow"
            size="lg"
          >
            {isLoggingIn ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LogIn className="w-5 h-5" />
                Sign in to Continue
              </span>
            )}
          </Button>

          <p className="mt-4 text-xs text-muted-foreground">
            Secured by Internet Identity
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai/?utm_source=Caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname || "swipetrack-pro")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
