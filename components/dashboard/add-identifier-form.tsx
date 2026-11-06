"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { apiFetch } from "@/lib/client-api";
import type { SerializedIdentifier } from "@/lib/serializers";

type AddPayload = { identifier: SerializedIdentifier };

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

export default function AddIdentifierForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [credential, setCredential] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    const result = await apiFetch<AddPayload>("/api/locker/identifiers", {
      method: "POST",
      body: { identifier, credential },
    });

    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }

    setIdentifier("");
    setCredential("");
    setBusy(false);
    startTransition(() => router.refresh());
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Add a credential
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Posts to <code className="font-mono text-xs">/api/locker/identifiers</code>.
          Both fields are encrypted at rest with AES-256-GCM.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      >
        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Identifier
          </span>
          <input
            type="text"
            required
            maxLength={200}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className={inputClass}
            placeholder="instagram:johndoe"
          />
        </label>

        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Credential
          </span>
          <input
            type="text"
            required
            maxLength={1024}
            value={credential}
            onChange={(event) => setCredential(event.target.value)}
            className={inputClass}
            placeholder="Password"
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {busy ? "Saving..." : "Save"}
        </button>
      </form>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
