"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { apiFetch } from "@/lib/client-api";
import type { SerializedIdentifier } from "@/lib/serializers";

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-100 dark:focus:ring-zinc-100/10";

const secondaryButton =
  "rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

export default function IdentifierRow({
  identifier,
}: {
  identifier: SerializedIdentifier;
}) {
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(identifier.identifier);
  const [secret, setSecret] = useState(identifier.credential);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  function startEditing() {
    setName(identifier.identifier);
    setSecret(identifier.credential);
    setError("");
    setEditing(true);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    const result = await apiFetch<{ identifier: SerializedIdentifier }>(
      `/api/locker/identifiers/${identifier.id}`,
      {
        method: "PATCH",
        body: { identifier: name, credential: secret },
      }
    );

    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setEditing(false);
    startTransition(() => router.refresh());
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${identifier.identifier}"?`)) return;
    setError("");
    setBusy(true);

    const result = await apiFetch<{ message: string }>(
      `/api/locker/identifiers/${identifier.id}`,
      { method: "DELETE" }
    );

    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <li className="py-4">
      {editing ? (
        <form
          onSubmit={handleSave}
          className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-center"
        >
          <input
            type="text"
            required
            maxLength={200}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
            aria-label="Identifier"
          />
          <input
            type="text"
            required
            maxLength={1024}
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            className={inputClass}
            aria-label="Credential"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {busy ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={busy}
              className={secondaryButton}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
              {identifier.identifier}
            </p>
            <p className="mt-1 font-mono text-sm text-zinc-500 dark:text-zinc-400">
              {revealed ? identifier.credential : "••••••••••••"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRevealed((value) => !value)}
              className={secondaryButton}
            >
              {revealed ? "Hide" : "Show"}
            </button>
            <button
              type="button"
              onClick={startEditing}
              className={secondaryButton}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              {busy ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      )}

      {error ? (
        <p
          role="alert"
          className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
        >
          {error}
        </p>
      ) : null}
    </li>
  );
}
