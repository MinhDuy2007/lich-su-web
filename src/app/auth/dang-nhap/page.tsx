import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Đăng nhập</h1>
      </header>
      <LoginForm />
    </section>
  );
}
