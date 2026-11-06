/**
 * Shared class strings so every form control, button and card uses the same
 * radius, border, spacing and focus treatment.
 */

export const cardClass =
  "rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(16,24,20,0.04)]";

export const inputClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60";

export const primaryButtonClass =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition hover:-translate-y-px hover:bg-accent-hover active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

export const secondaryButtonClass =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2 text-sm font-medium text-foreground transition hover:-translate-y-px hover:bg-surface-muted active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

export const smallPrimaryButtonClass =
  "inline-flex cursor-pointer items-center justify-center rounded-lg bg-accent px-3 py-2 text-xs font-medium text-accent-foreground transition hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60";

export const smallSecondaryButtonClass =
  "inline-flex cursor-pointer items-center justify-center rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground transition hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60";

export const iconButtonClass =
  "inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60";
