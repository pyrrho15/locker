"use client";

import { MoonIcon, SunIcon } from "@/components/icons";

export default function ThemeToggle() {
  function toggleTheme() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";

    root.dataset.theme = next;

    try {
      window.localStorage.setItem("locker-theme", next);
    } catch {
      // Private browsing can block storage; the in-memory theme still works.
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface text-muted transition hover:-translate-y-px hover:bg-surface-muted hover:text-foreground active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
    >
      <MoonIcon className="h-4 w-4 dark:hidden" />
      <SunIcon className="hidden h-4 w-4 dark:block" />
    </button>
  );
}
