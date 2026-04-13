"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const [email, setEmail] = useState("admin@group7.local");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid credentials or inactive account.");
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <form className="loginForm" onSubmit={onSubmit}>
      <label htmlFor="email">Email Address</label>
      <input
        autoComplete="email"
        id="email"
        onChange={(event) => setEmail(event.target.value)}
        required
        type="email"
        value={email}
      />

      <label htmlFor="password">Password</label>
      <input
        autoComplete="current-password"
        id="password"
        onChange={(event) => setPassword(event.target.value)}
        required
        type="password"
        value={password}
      />

      {error ? <p className="loginError">{error}</p> : null}

      <button className="primaryButton" disabled={loading} type="submit">
        {loading ? "Signing in..." : "Sign in to Dashboard"}
      </button>
    </form>
  );
}

