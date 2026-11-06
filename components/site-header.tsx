import Link from "next/link";
import { LockIcon } from "@/components/icons";
import ThemeToggle from "@/components/theme-toggle";

export default function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground transition group-hover:-rotate-3">
            <LockIcon className="h-4 w-4" />
          </span>
          <p className="text-base font-semibold tracking-tight text-foreground">
            Locker
          </p>
        </Link>

        <ThemeToggle />
      </div>
    </header>
  );
}
