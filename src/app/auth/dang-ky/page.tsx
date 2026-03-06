import { RegisterForm } from "@/components/auth/register-form";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Đăng ký tài khoản</h1>
        <p className="mt-1 text-sm text-fg/70">
          Hoàn tất thông tin để nhận OTP qua email và bắt đầu sử dụng.
        </p>
      </header>
      <RegisterForm />
    </section>
  );
}
