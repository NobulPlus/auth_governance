import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { ReviewItemActions } from "@/components/review-item-actions";
import { authOptions } from "@/lib/auth";
import { canManageReviews } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function reviewClass(status: string) {
  if (status === "COMPLETED") {
    return "tag tagCompleted";
  }
  if (status === "OVERDUE") {
    return "tag tagOverdue";
  }
  return "tag tagDue";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

async function getReviewData() {
  try {
    const [reviews, openItems] = await Promise.all([
      prisma.accessReview.findMany({
        orderBy: { dueDate: "asc" },
        include: {
          reviewOwner: { select: { name: true, email: true } },
          _count: { select: { items: true } },
        },
        take: 15,
      }),
      prisma.accessReviewItem.findMany({
        where: { reviewedAt: null },
        orderBy: { review: { dueDate: "asc" } },
          include: {
            review: { select: { title: true, dueDate: true, status: true } },
            reviewer: { select: { name: true, email: true } },
            assignment: { select: { systemName: true, effectiveRole: true } },
          },
        take: 20,
      }),
    ]);

    return { reviews, openItems };
  } catch {
    return { reviews: [], openItems: [] };
  }
}

export default async function ReviewsPage() {
  const [session, reviewData] = await Promise.all([getServerSession(authOptions), getReviewData()]);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { reviews, openItems } = reviewData;
  const canDecideByRole = session?.user?.role ? canManageReviews(session.user.role) : false;

  return (
    <main className="pageWrap">
      <section className="heroCard">
        <p className="heroKicker">Certification Campaigns</p>
        <h1 className="heroTitle">Periodic Access Reviews</h1>
        <p className="heroText">
          Review privileged and dormant access systematically to maintain least privilege and policy
          compliance.
        </p>
      </section>

      <section className="sectionGrid">
        <article className="panelCard">
          <h2 className="panelTitle">Review Campaigns</h2>
          <p className="panelSubtle">Scheduled certifications and ownership accountability.</p>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Owner</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Items</th>
                </tr>
              </thead>
              <tbody>
                {reviews.length === 0 ? (
                  <tr>
                    <td className="empty" colSpan={5}>
                      No review campaigns yet.
                    </td>
                  </tr>
                ) : (
                  reviews.map((review) => (
                    <tr key={review.id}>
                      <td>{review.title}</td>
                      <td>{review.reviewOwner.name ?? review.reviewOwner.email}</td>
                      <td>{formatDate(review.dueDate)}</td>
                      <td>
                        <span className={reviewClass(review.status)}>{review.status}</span>
                      </td>
                      <td>{review._count.items}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </article>
        <aside className="panelCard">
          <h2 className="panelTitle">Pending Decisions</h2>
          <p className="panelSubtle">Outstanding review line items requiring action.</p>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>System</th>
                  <th>Role</th>
                  <th>Reviewer</th>
                  <th>Due</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {openItems.length === 0 ? (
                  <tr>
                    <td className="empty" colSpan={5}>
                      All review items are complete.
                    </td>
                  </tr>
                ) : (
                  openItems.map((item) => (
                    <tr key={item.id}>
                      <td>{item.assignment.systemName}</td>
                      <td>{item.assignment.effectiveRole}</td>
                      <td>{item.reviewer.name ?? item.reviewer.email}</td>
                      <td>{formatDate(item.review.dueDate)}</td>
                      <td>
                        <ReviewItemActions
                          disabled={!canDecideByRole && session?.user?.id !== item.reviewerId}
                          itemId={item.id}
                        />
                      </td>
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
