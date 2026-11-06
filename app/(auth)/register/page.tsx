import type { Metadata } from "next";
import RegisterForm from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default function RegisterPage() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Create your locker
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        One account, one locker for all your social credentials.
      </p>
      <RegisterForm />
    </div>
  );
}
