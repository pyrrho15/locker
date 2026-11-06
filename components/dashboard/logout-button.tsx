"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { smallSecondaryButtonClass } from "@/lib/ui";

export default function LogoutButton({
  label = "Sign out",
}: {
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);

    const result = await apiFetch<{ message: string }>("/api/auth/logout", {
      method: "POST",
    });

    if (!result.ok) {
      window.alert(result.error);
      setBusy(false);
      return;
    }

    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={busy}
      className={smallSecondaryButtonClass}
    >
      {busy ? "Signing out..." : label}
    </button>
  );
}
