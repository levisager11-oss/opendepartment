"use client";

import { useRouter } from "next/navigation";
import { ControlAuthPanel } from "@/components/setup/ControlAuthPanel";

/**
 * Thin client wrapper so the login page can stay a server component.
 * ControlAuthPanel takes an onSignedIn callback, and a server component cannot
 * hand a function across the boundary.
 */
export function AccountLoginForm({
  target,
  linkFailed = false,
}: {
  target: string;
  linkFailed?: boolean;
}) {
  const router = useRouter();

  return (
    <ControlAuthPanel
      initialMode="signin"
      linkFailed={linkFailed}
      onSignedIn={() => {
        router.push(target);
        router.refresh();
      }}
    />
  );
}
