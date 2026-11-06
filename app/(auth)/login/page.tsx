import type { Metadata } from "next";
import LoginForm from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Welcome back
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Sign in to open your locker.
      </p>
      <LoginForm />
    </div>
  );
}
