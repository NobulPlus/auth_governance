import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";

import { SignOutButton } from "@/components/sign-out-button";
import { authOptions } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Identity Governance Hub",
  description: "Operational dashboard for authentication governance and access controls.",
};

const navLinks = [
  { href: "/", label: "Overview" },
  { href: "/requests", label: "Requests" },
  { href: "/reviews", label: "Reviews" },
  { href: "/users", label: "Users" },
  { href: "/audit", label: "Audit" },
];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body>
        <div className="backgroundOrbs" aria-hidden="true">
          <span className="orb orbA" />
          <span className="orb orbB" />
          <span className="orb orbC" />
        </div>
        <header className="topBar">
          <div className="topBarInner">
            <Link className="brand" href="/">
              <span className="brandPulse" />
              Identity Governance Hub
            </Link>
            <nav className="mainNav" aria-label="Primary">
              {navLinks.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="authArea">
              {session?.user ? (
                <>
                  <span className="userTag">{session.user.email}</span>
                  <SignOutButton />
                </>
              ) : (
                <Link className="primaryButton" href="/login">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
