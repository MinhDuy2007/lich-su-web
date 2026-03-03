import { RegisterForm } from "@/components/auth/register-form";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Dang ky tai khoan</h1>
        <p className="mt-1 text-sm text-fg/70">
          Hoan tat thong tin, nhan OTP qua Supabase Auth Email va xac thuc captcha.
        </p>
      </header>
      <RegisterForm />
    </section>
  );
}
