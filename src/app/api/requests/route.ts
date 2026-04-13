import { AuditActionType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createRequestSchema = z.object({
  systemName: z.string().trim().min(2).max(100),
  requestedRole: z.string().trim().min(2).max(100),
  businessJustify: z.string().trim().min(10).max(500),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const created = await prisma.accessRequest.create({
    data: {
      requesterId: session.user.id,
      systemName: parsed.data.systemName,
      requestedRole: parsed.data.requestedRole,
      businessJustify: parsed.data.businessJustify,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: session.user.id,
      action: AuditActionType.ACCESS_REQUEST_CREATED,
      targetType: "ACCESS_REQUEST",
      targetId: created.id,
    },
  });

  return NextResponse.json({ ok: true, id: created.id });
}

