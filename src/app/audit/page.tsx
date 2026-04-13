import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function actionClass(action: string) {
  if (action.includes("FAILURE") || action.includes("REJECTED")) {
    return "tag tagRejected";
  }
  if (action.includes("APPROVED") || action.includes("SUCCESS") || action.includes("COMPLETED")) {
    return "tag tagApproved";
  }
  return "tag tagPending";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function getAuditData() {
  try {
    const [events, topActions] = await Promise.all([
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        include: { actor: { select: { name: true, email: true } } },
        take: 40,
      }),
      prisma.auditLog.groupBy({
        by: ["action"],
        _count: { action: true },
        orderBy: { _count: { action: "desc" } },
      }),
    ]);

    return { events, topActions: topActions.slice(0, 8) };
  } catch {
    return { events: [], topActions: [] };
  }
}

export default async function AuditPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { events, topActions } = await getAuditData();

  return (
    <main className="pageWrap">
      <section className="heroCard">
        <p className="heroKicker">Control Evidence</p>
        <h1 className="heroTitle">Authentication Audit Stream</h1>
        <p className="heroText">
          Centralized event visibility for login activity, access decisions, and governance change history.
        </p>
      </section>

      <section className="sectionGrid">
        <article className="panelCard">
          <h2 className="panelTitle">Recent Events</h2>
          <p className="panelSubtle">Chronological system evidence for monitoring and incident review.</p>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td className="empty" colSpan={5}>
                      No audit events available.
                    </td>
                  </tr>
                ) : (
                  events.map((event) => (
                    <tr key={event.id}>
                      <td>{formatDate(event.createdAt)}</td>
                      <td>{event.actor?.name ?? event.actor?.email ?? "System"}</td>
                      <td>
                        <span className={actionClass(event.action)}>{event.action}</span>
                      </td>
                      <td>{event.targetType}</td>
                      <td>{event.ipAddress ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
        <aside className="panelCard">
          <h2 className="panelTitle">Action Distribution</h2>
          <p className="panelSubtle">Most frequent governance and auth event categories.</p>
          <div className="metricList">
            {topActions.length === 0 ? (
              <p className="empty">No action distribution yet.</p>
            ) : (
              topActions.map((entry) => (
                <div className="metricItem" key={entry.action}>
                  <p className="metricName">{entry.action}</p>
                  <p className="metricValue">{entry._count.action}</p>
                </div>
              ))
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
