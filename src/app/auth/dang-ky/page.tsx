import { RegisterForm } from "@/components/auth/register-form";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Đăng ký tài khoản</h1>
      </header>
      <RegisterForm />
    </section>
  );
}
