"use client";

import { ButtonHTMLAttributes, useEffect, useState } from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/cn";

type ThemeToggleProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function ThemeToggle({ className, ...props }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button
        aria-label="đổi giao diện"
        className={cn(
          "h-10 w-10 rounded-xl border border-border bg-card",
          className
        )}
        type="button"
        {...props}
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      aria-label="đổi giao diện"
      className={cn(
        "h-10 w-10 rounded-xl border border-border bg-card text-fg transition hover:scale-105",
        className
      )}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      type="button"
      {...props}
    >
      {isDark ? (
        <SunMedium className="mx-auto h-4 w-4" />
      ) : (
        <MoonStar className="mx-auto h-4 w-4" />
      )}
    </button>
  );
}

