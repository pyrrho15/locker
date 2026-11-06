import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import AddIdentifierForm from "@/components/dashboard/add-identifier-form";
import IdentifierList from "@/components/dashboard/identifier-list";
import LogoutButton from "@/components/dashboard/logout-button";
import { getCurrentUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { serializeLocker } from "@/lib/serializers";
import Locker from "@/models/Locker";
import User from "@/models/User";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <main className="flex-1 bg-zinc-50 px-4 py-10 dark:bg-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              Phase 2 test console
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Locker
            </h1>
          </div>
          <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
            Exercise the auth, locker, and identifier endpoints through a small
            UI.
          </p>
        </header>

        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>
      </div>
    </main>
  );
}

async function DashboardContent() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  await connectDB();

  const [user, locker] = await Promise.all([
    User.findById(userId).select("email createdAt").lean(),
    Locker.findOne({ userId }),
  ]);

  if (!user) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Session out of sync
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          The signed-in user no longer exists. Clear the session and sign in
          again.
        </p>
        <div className="mt-4">
          <LogoutButton label="Clear session" />
        </div>
      </section>
    );
  }

  const identifiers = locker ? serializeLocker(locker).identifiers : [];

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Signed in as
          </p>
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            {user.email}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            {identifiers.length}{" "}
            {identifiers.length === 1 ? "credential" : "credentials"}
          </span>
          <LogoutButton />
        </div>
      </section>

      <AddIdentifierForm />
      <IdentifierList identifiers={identifiers} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your locker...</span>
      <div className="h-24 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-40 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-64 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}
