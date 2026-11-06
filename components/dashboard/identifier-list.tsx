import { LockIcon } from "@/components/icons";
import type { SerializedIdentifier } from "@/lib/serializers";
import { cardClass } from "@/lib/ui";
import IdentifierRow from "./identifier-row";

export default function IdentifierList({
  identifiers,
}: {
  identifiers: SerializedIdentifier[];
}) {
  return (
    <section className={cardClass}>
      <div className="flex items-center justify-between gap-3 border-b border-border p-5 sm:p-6">
        <h2 className="text-base font-semibold tracking-tight text-foreground">
          Saved credentials
        </h2>
        <span className="rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted">
          {identifiers.length} {identifiers.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {identifiers.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-muted text-muted">
            <LockIcon className="h-5 w-5" />
          </span>
          <p className="mt-4 text-sm font-medium text-foreground">
            Your locker is empty
          </p>
          <p className="mt-1 text-sm text-muted">
            Add your first credential using the form above.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border px-5 sm:px-6">
          {identifiers.map((identifier) => (
            <IdentifierRow
              key={`${identifier.id}:${identifier.credential}`}
              identifier={identifier}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
