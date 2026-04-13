import { AuditActionType, ReviewStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { canManageReviews } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const reviewDecisionSchema = z.object({
  keepAccess: z.boolean(),
  comment: z.string().trim().max(250).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { itemId } = await params;
  const body = await request.json();
  const parsed = reviewDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const item = await prisma.accessReviewItem.findUnique({
    where: { id: itemId },
    include: {
      review: true,
      assignment: true,
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Review item not found" }, { status: 404 });
  }

  const authorized =
    item.reviewerId === session.user.id || canManageReviews(session.user.role);
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.accessReviewItem.update({
      where: { id: item.id },
      data: {
        keepAccess: parsed.data.keepAccess,
        comment: parsed.data.comment,
        reviewedAt: new Date(),
      },
    });

    if (!parsed.data.keepAccess) {
      await tx.accessAssignment.update({
        where: { id: item.assignmentId },
        data: { isActive: false },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: session.user.id,
          action: AuditActionType.ACCOUNT_DEACTIVATED,
          targetType: "ACCESS_ASSIGNMENT",
          targetId: item.assignmentId,
          metadata: { reason: "Review decision: revoke access" },
        },
      });
    }

    const unresolved = await tx.accessReviewItem.count({
      where: {
        reviewId: item.reviewId,
        reviewedAt: null,
      },
    });

    if (unresolved === 0) {
      await tx.accessReview.update({
        where: { id: item.reviewId },
        data: {
          status: ReviewStatus.COMPLETED,
          completedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: session.user.id,
          action: AuditActionType.REVIEW_COMPLETED,
          targetType: "ACCESS_REVIEW",
          targetId: item.reviewId,
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}

