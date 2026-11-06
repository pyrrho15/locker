import type { SerializedIdentifier } from "@/lib/serializers";
import IdentifierRow from "./identifier-row";

export default function IdentifierList({
  identifiers,
}: {
  identifiers: SerializedIdentifier[];
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 p-5 dark:border-zinc-800">
        <div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Saved credentials
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Loaded from MongoDB by the dashboard Server Component.
          </p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {identifiers.length} {identifiers.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {identifiers.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Your locker is empty
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Add your first identifier using the form above.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-200 px-5 dark:divide-zinc-800">
          {identifiers.map((identifier) => (
            <IdentifierRow key={identifier.id} identifier={identifier} />
          ))}
        </ul>
      )}
    </section>
  );
}
