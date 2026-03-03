import { type ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-10">
      <div className="w-full rounded-3xl border border-border bg-card/80 p-6 shadow-2xl shadow-primary/10 md:p-8">
        <Link className="mb-6 inline-block text-sm font-semibold text-primary" href="/">
          Ve trang chu
        </Link>
        {children}
      </div>
    </div>
  );
}

