"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { apiFetch } from "@/lib/client-api";
import type { SerializedIdentifier } from "@/lib/serializers";
import { cardClass, inputClass, primaryButtonClass } from "@/lib/ui";

type AddPayload = { identifier: SerializedIdentifier };

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
    <section className={`${cardClass} p-5 sm:p-6`}>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Add a credential
      </h2>

      <form
        onSubmit={handleSubmit}
        className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <input
          type="text"
          required
          maxLength={200}
          autoComplete="off"
          spellCheck={false}
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          className={`${inputClass} min-w-0 flex-1`}
          placeholder="Identifier"
          aria-label="Identifier"
        />
        <input
          type="text"
          required
          maxLength={1024}
          autoComplete="off"
          spellCheck={false}
          value={credential}
          onChange={(event) => setCredential(event.target.value)}
          className={`${inputClass} min-w-0 flex-1`}
          placeholder="Credential"
          aria-label="Credential"
        />
        <button
          type="submit"
          disabled={busy}
          className={`${primaryButtonClass} sm:shrink-0`}
        >
          {busy ? "Saving..." : "Save"}
        </button>
      </form>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-danger/20 bg-danger-muted px-3.5 py-2.5 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
