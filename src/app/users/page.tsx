import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function roleClass(role: string) {
  if (role.includes("ADMIN") || role === "AUDITOR") {
    return "tag tagAdmin";
  }
  return "tag tagStaff";
}

function formatDate(date: Date | null) {
  if (!date) {
    return "Never";
  }
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

async function getUserData() {
  try {
    const [users, activeAssignments] = await Promise.all([
      prisma.user.findMany({
        orderBy: [{ role: "asc" }, { createdAt: "desc" }],
        include: { _count: { select: { accessAssignments: true } } },
        take: 30,
      }),
      prisma.accessAssignment.findMany({
        where: { isActive: true },
        include: {
          user: { select: { name: true, email: true } },
          grantedBy: { select: { name: true, email: true } },
        },
        orderBy: { grantedAt: "desc" },
        take: 20,
      }),
    ]);

    return { users, activeAssignments };
  } catch {
    return { users: [], activeAssignments: [] };
  }
}

export default async function UsersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { users, activeAssignments } = await getUserData();

  return (
    <main className="pageWrap">
      <section className="heroCard">
        <p className="heroKicker">Identity Lifecycle</p>
        <h1 className="heroTitle">User and Role Governance</h1>
        <p className="heroText">
          Keep account ownership clear, enforce role boundaries, and monitor privileged assignments.
        </p>
      </section>

      <section className="sectionGrid">
        <article className="panelCard">
          <h2 className="panelTitle">Directory Snapshot</h2>
          <p className="panelSubtle">Current account state, role tier, and adoption metrics.</p>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Name / Email</th>
                  <th>Institution</th>
                  <th>Role</th>
                  <th>MFA</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>Assignments</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td className="empty" colSpan={7}>
                      No users loaded.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name ?? user.email}</td>
                      <td>{user.institutionType}</td>
                      <td>
                        <span className={roleClass(user.role)}>{user.role}</span>
                      </td>
                      <td>{user.mfaEnabled ? "Enabled" : "Not enabled"}</td>
                      <td>{user.isActive ? "Active" : "Inactive"}</td>
                      <td>{formatDate(user.lastLoginAt)}</td>
                      <td>{user._count.accessAssignments}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
        <aside className="panelCard">
          <h2 className="panelTitle">Recent Assignments</h2>
          <p className="panelSubtle">Privileges granted with accountable approvers.</p>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>System</th>
                  <th>Role</th>
                  <th>Granted By</th>
                </tr>
              </thead>
              <tbody>
                {activeAssignments.length === 0 ? (
                  <tr>
                    <td className="empty" colSpan={4}>
                      No active assignments found.
                    </td>
                  </tr>
                ) : (
                  activeAssignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td>{assignment.user.name ?? assignment.user.email}</td>
                      <td>{assignment.systemName}</td>
                      <td>{assignment.effectiveRole}</td>
                      <td>{assignment.grantedBy.name ?? assignment.grantedBy.email}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </aside>
      </section>
    </main>
  );
}
