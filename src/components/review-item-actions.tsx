"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  itemId: string;
  disabled?: boolean;
};

export function ReviewItemActions({ itemId, disabled }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"keep" | "revoke" | null>(null);

  async function submit(keepAccess: boolean) {
    setLoading(keepAccess ? "keep" : "revoke");

    const response = await fetch(`/api/reviews/items/${itemId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keepAccess,
        comment: keepAccess ? "Access retained after review" : "Access revoked after review",
      }),
    });

    setLoading(null);
    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <div className="tableActions">
      <button
        className="ghostButton"
        disabled={disabled || loading !== null}
        onClick={() => submit(true)}
        type="button"
      >
        {loading === "keep" ? "Saving..." : "Keep"}
      </button>
      <button
        className="ghostButton dangerAction"
        disabled={disabled || loading !== null}
        onClick={() => submit(false)}
        type="button"
      >
        {loading === "revoke" ? "Revoking..." : "Revoke"}
      </button>
    </div>
  );
}

