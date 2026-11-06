"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import {
  CheckIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  MoreHorizontalIcon,
  PencilIcon,
  TrashIcon,
} from "@/components/icons";
import { apiFetch } from "@/lib/client-api";
import type { SerializedIdentifier } from "@/lib/serializers";
import {
  iconButtonClass,
  inputClass,
  smallPrimaryButtonClass,
  smallSecondaryButtonClass,
} from "@/lib/ui";

const fieldActionClass =
  "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30";

export default function IdentifierRow({
  identifier,
}: {
  identifier: SerializedIdentifier;
}) {
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [secret, setSecret] = useState(identifier.credential);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const credentialRef = useRef<HTMLInputElement>(null);
  const copiedTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimer.current !== null) {
        window.clearTimeout(copiedTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    function closeOnOutsidePress(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (editing) credentialRef.current?.focus();
  }, [editing]);

  function startEditing() {
    setMenuOpen(false);
    setSecret(identifier.credential);
    setError("");
    setRevealed(true);
    setEditing(true);
  }

  function cancelEditing() {
    setSecret(identifier.credential);
    setError("");
    setEditing(false);
  }

  async function copyCredential() {
    setError("");

    try {
      await window.navigator.clipboard.writeText(secret);
      setCopied(true);

      if (copiedTimer.current !== null) {
        window.clearTimeout(copiedTimer.current);
      }

      copiedTimer.current = window.setTimeout(() => {
        setCopied(false);
        copiedTimer.current = null;
      }, 1600);
    } catch {
      setError("Could not copy the credential to the clipboard");
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;

    setError("");
    setBusy(true);

    const result = await apiFetch<{ identifier: SerializedIdentifier }>(
      `/api/locker/identifiers/${identifier.id}`,
      {
        method: "PATCH",
        body: { credential: secret },
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
    setMenuOpen(false);

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
    <li className="py-3">
      <form
        onSubmit={handleSave}
        className="flex flex-row items-center gap-1.5 sm:gap-2"
      >
        <input
          type="text"
          readOnly
          value={identifier.identifier}
          aria-label="Identifier"
          className={`${inputClass} min-w-0 flex-1 cursor-default bg-surface-muted/60`}
        />

        <div className="relative min-w-0 flex-1">
          <input
            ref={credentialRef}
            type={editing || revealed ? "text" : "password"}
            readOnly={!editing}
            required
            maxLength={1024}
            autoComplete="off"
            spellCheck={false}
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            aria-label="Credential"
            className={`${inputClass} pr-16 ${
              editing ? "" : "cursor-default bg-surface-muted/60"
            }`}
          />
          <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
            <button
              type="button"
              onClick={copyCredential}
              aria-label={copied ? "Credential copied" : "Copy credential"}
              title={copied ? "Credential copied" : "Copy credential"}
              className={`${fieldActionClass} ${
                copied ? "text-accent" : "text-muted hover:text-foreground"
              }`}
            >
              {copied ? (
                <CheckIcon className="h-4 w-4" />
              ) : (
                <CopyIcon className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setRevealed((value) => !value)}
              aria-label={revealed ? "Hide credential" : "Show credential"}
              title={revealed ? "Hide credential" : "Show credential"}
              className={`${fieldActionClass} text-muted hover:text-foreground`}
            >
              {revealed ? (
                <EyeOffIcon className="h-4 w-4" />
              ) : (
                <EyeIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div ref={menuRef} className="relative shrink-0">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <button
                type="submit"
                disabled={busy}
                className={smallPrimaryButtonClass}
              >
                {busy ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={busy}
                className={smallSecondaryButtonClass}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={`Actions for ${identifier.identifier}`}
              className={iconButtonClass}
            >
              <MoreHorizontalIcon className="h-5 w-5" />
            </button>
          )}

          {menuOpen && !editing ? (
            <div
              role="menu"
              aria-label={`Actions for ${identifier.identifier}`}
              className="absolute right-0 top-full z-30 mt-2 w-40 rounded-xl border border-border bg-surface p-1 shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
            >
              <button
                type="button"
                role="menuitem"
                onClick={startEditing}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
              >
                <PencilIcon className="h-4 w-4 text-muted" />
                Edit
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleDelete}
                disabled={busy}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger transition hover:bg-danger-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <TrashIcon className="h-4 w-4" />
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </form>

      {error ? (
        <p
          role="alert"
          className="mt-2 rounded-xl border border-danger/20 bg-danger-muted px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}
    </li>
  );
}
