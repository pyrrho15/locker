import { Suspense } from "react";
import AuthPanel from "@/components/auth/auth-panel";
import AddIdentifierForm from "@/components/dashboard/add-identifier-form";
import IdentifierList from "@/components/dashboard/identifier-list";
import LogoutButton from "@/components/dashboard/logout-button";
import { getCurrentUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { serializeLocker } from "@/lib/serializers";
import { cardClass } from "@/lib/ui";
import Locker from "@/models/Locker";
import User from "@/models/User";

export default function Home() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return <AuthPanel />;
  }

  await connectDB();

  const [user, locker] = await Promise.all([
    User.findById(userId).select("email createdAt").lean(),
    Locker.findOne({ userId }),
  ]);

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col justify-center py-6 sm:py-12">
        <section className={`${cardClass} p-6`}>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Session out of sync
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            The signed-in user no longer exists. Clear the session and sign in
            again.
          </p>
          <div className="mt-5">
            <LogoutButton label="Clear session" />
          </div>
        </section>
      </div>
    );
  }

  const identifiers = locker ? serializeLocker(locker).identifiers : [];

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Your locker</h1>

      <section
        className={`${cardClass} flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6`}
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">
            Signed in as
          </p>
          <p className="mt-1 text-base font-medium text-foreground">
            {user.email}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <p className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            {identifiers.length}{" "}
            {identifiers.length === 1 ? "credential" : "credentials"}
          </p>
          <LogoutButton />
        </div>
      </section>

      <AddIdentifierForm />
      <IdentifierList identifiers={identifiers} />
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <p className="sr-only">Loading your locker...</p>
      <div className="h-24 animate-pulse rounded-2xl border border-border bg-surface-muted" />
      <div className="h-36 animate-pulse rounded-2xl border border-border bg-surface-muted" />
      <div className="h-64 animate-pulse rounded-2xl border border-border bg-surface-muted" />
    </div>
  );
}
