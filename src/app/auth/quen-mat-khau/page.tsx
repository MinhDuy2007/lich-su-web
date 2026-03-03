import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Quen mat khau</h1>
        <p className="mt-1 text-sm text-fg/70">
          Yeu cau OTP va dat lai mat khau bang email.
        </p>
      </header>
      <ForgotPasswordForm />
    </section>
  );
}

