import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Locker
          </Link>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Phase 1 test console
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
