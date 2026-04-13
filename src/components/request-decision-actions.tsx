"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  requestId: string;
  disabled?: boolean;
};

export function RequestDecisionActions({ requestId, disabled }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<"APPROVED" | "REJECTED" | null>(null);

  async function submitDecision(decision: "APPROVED" | "REJECTED") {
    setLoading(decision);

    const response = await fetch(`/api/requests/${requestId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        note: decision === "APPROVED" ? "Approved via governance UI" : "Rejected via governance UI",
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
        onClick={() => submitDecision("APPROVED")}
        type="button"
      >
        {loading === "APPROVED" ? "Approving..." : "Approve"}
      </button>
      <button
        className="ghostButton dangerAction"
        disabled={disabled || loading !== null}
        onClick={() => submitDecision("REJECTED")}
        type="button"
      >
        {loading === "REJECTED" ? "Rejecting..." : "Reject"}
      </button>
    </div>
  );
}

