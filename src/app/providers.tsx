"use client";

import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";
import { type ReactNode } from "react";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <QueryProvider>
        {children}
        <Toaster richColors position="top-right" />
      </QueryProvider>
    </ThemeProvider>
  );
}

//Khong gui duoc OTP qua email: Resend dang o che do test. Ban chi gui duoc den email chu tai khoan Resend. Muon gui den email khac, can verify domain va dat RESEND_FROM_EMAIL theo domain da verify.