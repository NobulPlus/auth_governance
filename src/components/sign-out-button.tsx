"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="ghostButton"
      onClick={() => signOut({ callbackUrl: "/login" })}
      type="button"
    >
      Sign out
    </button>
  );
}

