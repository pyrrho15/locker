"use client";

import { useEffect } from "react";
import { LockIcon } from "@/components/icons";
import { cardClass, primaryButtonClass } from "@/lib/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center py-6 sm:py-12">
      <section className={`${cardClass} p-6 text-center`}>
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-muted text-muted">
          <LockIcon className="h-5 w-5" />
        </span>
        <h1 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
          Could not load your locker
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Check that <code className="font-mono">MONGODB_URI</code> is set and
          the database is reachable, then try again.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className={`${primaryButtonClass} mt-5`}
        >
          Try again
        </button>
      </section>
    </div>
  );
}
