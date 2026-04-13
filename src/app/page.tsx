import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DashboardData = {
  pendingRequests: number;
  privilegedAssignments: number;
  overdueReviews: number;
  auditEvents: number;
  recentRequests: Array<{
    id: string;
    systemName: string;
    requestedRole: string;
    status: string;
    requestedAt: Date;
    requester: { name: string | null; email: string };
  }>;
  openReviews: Array<{
    id: string;
    title: string;
    status: string;
    dueDate: Date;
  }>;
};

function statusClass(status: string) {
  if (status === "APPROVED" || status === "COMPLETED" || status === "SUPER_ADMIN") {
    return "tag tagApproved";
  }
  if (status === "REJECTED" || status === "OVERDUE") {
    return "tag tagRejected";
  }
  return "tag tagPending";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

async function getDashboardData(): Promise<DashboardData> {
  try {
    const [pendingRequests, privilegedAssignments, overdueReviews, auditEvents, recentRequests, openReviews] =
      await Promise.all([
        prisma.accessRequest.count({ where: { status: "PENDING" } }),
        prisma.accessAssignment.count({ where: { isPrivileged: true, isActive: true } }),
        prisma.accessReview.count({ where: { status: "OVERDUE" } }),
        prisma.auditLog.count(),
        prisma.accessRequest.findMany({
          orderBy: { requestedAt: "desc" },
          take: 6,
          include: { requester: { select: { name: true, email: true } } },
        }),
        prisma.accessReview.findMany({
          where: { status: { in: ["DUE", "OVERDUE"] } },
          orderBy: { dueDate: "asc" },
          take: 5,
          select: { id: true, title: true, status: true, dueDate: true },
        }),
      ]);

    return {
      pendingRequests,
      privilegedAssignments,
      overdueReviews,
      auditEvents,
      recentRequests,
      openReviews,
    };
  } catch {
    return {
      pendingRequests: 0,
      privilegedAssignments: 0,
      overdueReviews: 0,
      auditEvents: 0,
      recentRequests: [],
      openReviews: [],
    };
  }
}

export default async function HomePage() {
  const [session, data] = await Promise.all([getServerSession(authOptions), getDashboardData()]);
  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <main className="pageWrap">
      <section className="heroCard">
        <p className="heroKicker">Governance Command Center</p>
        <h1 className="heroTitle">Authentication Operations at a Glance</h1>
        <p className="heroText">
          Drive policy enforcement, speed up approvals, and keep dormant or privileged accounts under
          continuous review.
        </p>
        <div className="splitActions">
          <Link className="primaryButton" href="/requests">
            Open Request Queue
          </Link>
          <Link className="ghostButton" href="/audit">
            View Audit Stream
          </Link>
        </div>
      </section>

      <section className="gridStats">
        <article className="statCard">
          <p className="statLabel">Pending Requests</p>
          <p className="statValue">{data.pendingRequests}</p>
        </article>
        <article className="statCard">
          <p className="statLabel">Privileged Active Accounts</p>
          <p className="statValue">{data.privilegedAssignments}</p>
        </article>
        <article className="statCard">
          <p className="statLabel">Overdue Reviews</p>
          <p className="statValue">{data.overdueReviews}</p>
        </article>
        <article className="statCard">
          <p className="statLabel">Audit Events Captured</p>
          <p className="statValue">{data.auditEvents}</p>
        </article>
      </section>

      <section className="sectionGrid">
        <article className="panelCard">
          <h2 className="panelTitle">Recent Access Requests</h2>
          <p className="panelSubtle">Latest workflow entries and their current state.</p>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Requester</th>
                  <th>System</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentRequests.length === 0 ? (
                  <tr>
                    <td className="empty" colSpan={5}>
                      No request data yet. Seed records or submit new requests.
                    </td>
                  </tr>
                ) : (
                  data.recentRequests.map((request) => (
                    <tr key={request.id}>
                      <td>{request.requester.name ?? request.requester.email}</td>
                      <td>{request.systemName}</td>
                      <td>{request.requestedRole}</td>
                      <td>
                        <span className={statusClass(request.status)}>{request.status}</span>
                      </td>
                      <td>{formatDate(request.requestedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
        <aside className="panelCard">
          <h2 className="panelTitle">Operational Health</h2>
          <p className="panelSubtle">Current governance pressure points.</p>
          <div className="metricList">
            <div className="metricItem">
              <p className="metricName">Active Session</p>
              <p className="metricValue">{session?.user?.role ?? "Guest"}</p>
            </div>
            <div className="metricItem">
              <p className="metricName">Open Review Campaigns</p>
              <p className="metricValue">{data.openReviews.length}</p>
            </div>
            <div className="metricItem">
              <p className="metricName">Critical Backlog</p>
              <p className="metricValue">{data.overdueReviews + data.pendingRequests}</p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
