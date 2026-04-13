"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function RequestCreateForm() {
  const router = useRouter();
  const [systemName, setSystemName] = useState("");
  const [requestedRole, setRequestedRole] = useState("");
  const [businessJustify, setBusinessJustify] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemName, requestedRole, businessJustify }),
    });

    setLoading(false);

    if (!response.ok) {
      setMessage("Unable to submit request. Check your inputs and try again.");
      return;
    }

    setSystemName("");
    setRequestedRole("");
    setBusinessJustify("");
    setMessage("Request submitted successfully.");
    router.refresh();
  }

  return (
    <form className="inlineForm" onSubmit={onSubmit}>
      <input
        onChange={(event) => setSystemName(event.target.value)}
        placeholder="System name"
        required
        value={systemName}
      />
      <input
        onChange={(event) => setRequestedRole(event.target.value)}
        placeholder="Requested role"
        required
        value={requestedRole}
      />
      <textarea
        onChange={(event) => setBusinessJustify(event.target.value)}
        placeholder="Business justification"
        required
        value={businessJustify}
      />
      <div className="splitActions">
        <button className="primaryButton" disabled={loading} type="submit">
          {loading ? "Submitting..." : "Submit Request"}
        </button>
      </div>
      {message ? <p className="panelSubtle">{message}</p> : null}
    </form>
  );
}

