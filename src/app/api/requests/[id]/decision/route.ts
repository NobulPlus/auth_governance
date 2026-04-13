import { AuditActionType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { canManageRequests } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";

const decisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().max(250).optional(),
});

function inferPrivileged(requestedRole: string) {
  return /admin|owner|approver|privileged|security/i.test(requestedRole);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !canManageRequests(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const target = await prisma.accessRequest.findUnique({
    where: { id },
    include: { assignment: true },
  });

  if (!target) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (target.status !== "PENDING") {
    return NextResponse.json({ error: "Request already resolved" }, { status: 409 });
  }

  const decision = parsed.data.decision;

  await prisma.$transaction(async (tx) => {
    await tx.requestApproval.create({
      data: {
        accessRequestId: target.id,
        approverId: session.user.id,
        decision,
        note: parsed.data.note,
      },
    });

    await tx.accessRequest.update({
      where: { id: target.id },
      data: {
        status: decision,
        completedAt: new Date(),
      },
    });

    if (decision === "APPROVED" && !target.assignment) {
      await tx.accessAssignment.create({
        data: {
          userId: target.requesterId,
          systemName: target.systemName,
          effectiveRole: target.requestedRole,
          grantedById: session.user.id,
          isPrivileged: inferPrivileged(target.requestedRole),
          sourceRequestId: target.id,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorUserId: session.user.id,
        action: decision === "APPROVED" ? AuditActionType.ACCESS_REQUEST_APPROVED : AuditActionType.ACCESS_REQUEST_REJECTED,
        targetType: "ACCESS_REQUEST",
        targetId: target.id,
        metadata: { note: parsed.data.note ?? null },
      },
    });
  });

  return NextResponse.json({ ok: true });
}
