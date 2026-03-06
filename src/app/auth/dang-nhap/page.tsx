import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Đăng nhập</h1>
        <p className="mt-1 text-sm text-fg/70">
          Đăng nhập bằng tên tài khoản, mật khẩu và mã xác thực.
        </p>
      </header>
      <LoginForm />
    </section>
  );
}
