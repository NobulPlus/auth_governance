import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { LoginForm } from "@/components/login-form";
import { authOptions } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="loginShell">
      <div className="loginGrid">
        <section className="loginCard">
          <p className="heroKicker">Secure Access</p>
          <h1 className="heroTitle" style={{ color: "var(--text)" }}>
            Institutional Authentication Governance
          </h1>
          <p className="panelSubtle">
            Centralized workflow for access requests, approvals, role governance, certification, and
            audit reporting.
          </p>
          <ul style={{ color: "var(--muted)", marginTop: 12, paddingLeft: 18, lineHeight: 1.7 }}>
            <li>Role-based access with accountable approvals</li>
            <li>Periodic review campaigns for privileged accounts</li>
            <li>Comprehensive authentication event auditability</li>
          </ul>
        </section>

        <section className="loginCard">
          <p className="heroKicker">Sign In</p>
          <h2 className="panelTitle">Welcome back</h2>
          <p className="panelSubtle">Use a seeded account or your institutional credentials.</p>
          <LoginForm />
        </section>
      </div>
    </main>
  );
}

