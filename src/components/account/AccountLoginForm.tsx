"use client";

import { useRouter } from "next/navigation";
import { ControlAuthPanel } from "@/components/setup/ControlAuthPanel";

/**
 * Thin client wrapper so the login page can stay a server component.
 * ControlAuthPanel takes an onSignedIn callback, and a server component cannot
 * hand a function across the boundary.
 */
export function AccountLoginForm({ target }: { target: string }) {
  const router = useRouter();

  return (
    <ControlAuthPanel
      onSignedIn={() => {
        router.push(target);
        router.refresh();
      }}
    />
  );
}
