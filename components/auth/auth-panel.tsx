"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/client-api";
import { inputClass, primaryButtonClass } from "@/lib/ui";

type Mode = "login" | "register";

type AuthPayload = {
  user: { id: string; email: string; lockerId: string | null };
  token: string;
};

const tabBase =
  "rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30";

export default function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setError("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setBusy(true);

    const result = await apiFetch<AuthPayload>(
      mode === "login" ? "/api/auth/login" : "/api/auth/register",
      {
        method: "POST",
        body: { email, password },
      }
    );

    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }

    setBusy(false);
    router.refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center py-6 sm:py-12">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
          Encrypted by default
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-foreground">
          {mode === "login" ? "Sign in to your locker" : "Create your locker"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          {mode === "login"
            ? "Your credentials are decrypted only for this session."
            : "One account, one encrypted locker for every social login."}
        </p>
      </div>

      <div className="mt-7 rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(16,24,20,0.04)] sm:p-6">
        <div
          className="grid grid-cols-2 gap-1 rounded-xl bg-surface-muted p-1"
          role="group"
          aria-label="Authentication mode"
        >
          <button
            type="button"
            onClick={() => switchMode("login")}
            aria-pressed={mode === "login"}
            className={`${tabBase} ${
              mode === "login"
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            aria-pressed={mode === "register"}
            className={`${tabBase} ${
              mode === "register"
                ? "bg-surface text-foreground shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="auth-email"
              className="block text-sm font-medium text-foreground"
            >
              Email
            </label>
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="auth-password"
              className="block text-sm font-medium text-foreground"
            >
              Password
            </label>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={mode === "register" ? 8 : undefined}
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
              placeholder={
                mode === "login" ? "Your password" : "At least 8 characters"
              }
            />
          </div>

          {mode === "register" ? (
            <div className="space-y-1.5">
              <label
                htmlFor="auth-confirm-password"
                className="block text-sm font-medium text-foreground"
              >
                Confirm password
              </label>
              <input
                id="auth-confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className={inputClass}
                placeholder="Repeat your password"
              />
            </div>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-danger/20 bg-danger-muted px-3.5 py-2.5 text-sm text-danger"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className={`${primaryButtonClass} w-full`}
          >
            {busy
              ? mode === "login"
                ? "Signing in..."
                : "Creating account..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-xs leading-5 text-muted">
        Credentials are stored with AES-256-GCM. Your login password is hashed
        with bcrypt.
      </p>
    </div>
  );
}
