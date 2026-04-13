import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { RequestCreateForm } from "@/components/request-create-form";
import { RequestDecisionActions } from "@/components/request-decision-actions";
import { authOptions } from "@/lib/auth";
import { canManageRequests } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function statusClass(status: string) {
  if (status === "APPROVED" || status === "PROVISIONED" || status === "CLOSED") {
    return "tag tagApproved";
  }
  if (status === "REJECTED") {
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

async function getRequestData() {
  try {
    const [summary, requests] = await Promise.all([
      prisma.accessRequest.groupBy({
        by: ["status"],
        _count: { status: true },
      }),
      prisma.accessRequest.findMany({
        orderBy: { requestedAt: "desc" },
        take: 20,
        include: {
          requester: { select: { name: true, email: true, institutionType: true } },
          approvals: {
            orderBy: { decidedAt: "desc" },
            take: 1,
            include: { approver: { select: { name: true, email: true } } },
          },
        },
      }),
    ]);

    return { summary, requests };
  } catch {
    return { summary: [], requests: [] };
  }
}

export default async function RequestsPage() {
  const [session, requestData] = await Promise.all([getServerSession(authOptions), getRequestData()]);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { summary, requests } = requestData;
  const canDecide = session?.user?.role ? canManageRequests(session.user.role) : false;

  return (
    <main className="pageWrap">
      <section className="heroCard">
        <p className="heroKicker">Workflow Monitoring</p>
        <h1 className="heroTitle">Access Request Governance</h1>
        <p className="heroText">
          Track submissions, approval decisions, and fulfillment state across institutional systems.
        </p>
      </section>

      <section className="sectionGrid">
        <article className="panelCard">
          <h2 className="panelTitle">Submit Access Request</h2>
          <p className="panelSubtle">Create a formal request with auditable business justification.</p>
          <RequestCreateForm />
        </article>
        <aside className="panelCard">
          <h2 className="panelTitle">Status Mix</h2>
          <p className="panelSubtle">Queue composition by current lifecycle state.</p>
          <div className="metricList">
            {summary.length === 0 ? (
              <p className="empty">No grouped metrics available yet.</p>
            ) : (
              summary.map((entry) => (
                <div className="metricItem" key={entry.status}>
                  <p className="metricName">{entry.status}</p>
                  <p className="metricValue">{entry._count.status}</p>
                </div>
              ))
            )}
          </div>
        </aside>
      </section>

      <section className="sectionGrid">
        <article className="panelCard" style={{ gridColumn: "1 / -1" }}>
          <h2 className="panelTitle">Request Ledger</h2>
          <p className="panelSubtle">End-to-end visibility from submission to final decision.</p>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Requester</th>
                  <th>Institution</th>
                  <th>System</th>
                  <th>Requested Role</th>
                  <th>Status</th>
                  <th>Last Decision</th>
                  <th>Requested</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr>
                    <td className="empty" colSpan={8}>
                      No requests yet.
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request.id}>
                      <td>{request.requester.name ?? request.requester.email}</td>
                      <td>{request.requester.institutionType}</td>
                      <td>{request.systemName}</td>
                      <td>{request.requestedRole}</td>
                      <td>
                        <span className={statusClass(request.status)}>{request.status}</span>
                      </td>
                      <td>
                        {request.approvals[0]
                          ? `${request.approvals[0].decision} by ${
                              request.approvals[0].approver.name ?? request.approvals[0].approver.email
                            }`
                          : "Awaiting decision"}
                      </td>
                      <td>{formatDate(request.requestedAt)}</td>
                      <td>
                        {request.status === "PENDING" ? (
                          <RequestDecisionActions disabled={!canDecide} requestId={request.id} />
                        ) : (
                          <span className="panelSubtle">Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  );
}
