/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv/config");

const { PrismaPg } = require("@prisma/adapter-pg");
const {
  PrismaClient,
  InstitutionType,
  UserRole,
  RequestStatus,
  ReviewStatus,
  AuditActionType,
} = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function upsertUser({ email, name, role, institutionType, password, mfaEnabled, isActive }) {
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
      institutionType,
      passwordHash,
      mfaEnabled,
      isActive,
      lastLoginAt: new Date(),
    },
    create: {
      email,
      name,
      role,
      institutionType,
      passwordHash,
      mfaEnabled,
      isActive,
      lastLoginAt: new Date(),
    },
  });
}

async function resetTransactionalData() {
  await prisma.$transaction([
    prisma.requestApproval.deleteMany(),
    prisma.accessReviewItem.deleteMany(),
    prisma.accessReview.deleteMany(),
    prisma.accessAssignment.deleteMany(),
    prisma.accessRequest.deleteMany(),
    prisma.auditLog.deleteMany(),
  ]);
}

async function main() {
  const [admin, securityAdmin, approver, auditor, staffPublic, staffPrivate] = await Promise.all([
    upsertUser({
      email: "admin@group7.local",
      name: "System Admin",
      role: UserRole.SUPER_ADMIN,
      institutionType: InstitutionType.PRIVATE,
      password: "Admin123!",
      mfaEnabled: true,
      isActive: true,
    }),
    upsertUser({
      email: "security@group7.local",
      name: "Security Admin",
      role: UserRole.SECURITY_ADMIN,
      institutionType: InstitutionType.PRIVATE,
      password: "Secure123!",
      mfaEnabled: true,
      isActive: true,
    }),
    upsertUser({
      email: "approver@group7.local",
      name: "Department Approver",
      role: UserRole.APPROVER,
      institutionType: InstitutionType.PUBLIC,
      password: "Approve123!",
      mfaEnabled: true,
      isActive: true,
    }),
    upsertUser({
      email: "auditor@group7.local",
      name: "Governance Auditor",
      role: UserRole.AUDITOR,
      institutionType: InstitutionType.PUBLIC,
      password: "Audit123!",
      mfaEnabled: true,
      isActive: true,
    }),
    upsertUser({
      email: "staff.public@group7.local",
      name: "Public Staff",
      role: UserRole.STAFF,
      institutionType: InstitutionType.PUBLIC,
      password: "Staff123!",
      mfaEnabled: false,
      isActive: true,
    }),
    upsertUser({
      email: "staff.private@group7.local",
      name: "Private Staff",
      role: UserRole.STAFF,
      institutionType: InstitutionType.PRIVATE,
      password: "Staff123!",
      mfaEnabled: true,
      isActive: true,
    }),
  ]);

  await resetTransactionalData();

  const requestA = await prisma.accessRequest.create({
    data: {
      requesterId: staffPublic.id,
      systemName: "Student Records",
      requestedRole: "Data Viewer",
      businessJustify: "Monthly regulatory reporting and trend analysis.",
      status: RequestStatus.PENDING,
      requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
    },
  });

  const requestB = await prisma.accessRequest.create({
    data: {
      requesterId: staffPrivate.id,
      systemName: "Finance ERP",
      requestedRole: "Invoice Approver",
      businessJustify: "Cross-team financial approvals during quarter close.",
      status: RequestStatus.APPROVED,
      requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 32),
      completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    },
  });

  const requestC = await prisma.accessRequest.create({
    data: {
      requesterId: staffPublic.id,
      systemName: "HR Suite",
      requestedRole: "Recruitment Operator",
      businessJustify: "Role no longer needed after team restructuring.",
      status: RequestStatus.REJECTED,
      requestedAt: new Date(Date.now() - 1000 * 60 * 60 * 64),
      completedAt: new Date(Date.now() - 1000 * 60 * 60 * 58),
    },
  });

  await prisma.requestApproval.createMany({
    data: [
      {
        accessRequestId: requestB.id,
        approverId: approver.id,
        decision: RequestStatus.APPROVED,
        note: "Business justification confirmed with finance manager.",
      },
      {
        accessRequestId: requestC.id,
        approverId: securityAdmin.id,
        decision: RequestStatus.REJECTED,
        note: "Requested privilege exceeds current job function.",
      },
    ],
  });

  const assignmentA = await prisma.accessAssignment.create({
    data: {
      userId: staffPrivate.id,
      systemName: "Finance ERP",
      effectiveRole: "Invoice Approver",
      grantedById: approver.id,
      isPrivileged: true,
      sourceRequestId: requestB.id,
      grantedAt: new Date(Date.now() - 1000 * 60 * 60 * 22),
    },
  });

  const assignmentB = await prisma.accessAssignment.create({
    data: {
      userId: securityAdmin.id,
      systemName: "Identity Core",
      effectiveRole: "Policy Administrator",
      grantedById: admin.id,
      isPrivileged: true,
      grantedAt: new Date(Date.now() - 1000 * 60 * 60 * 120),
    },
  });

  const assignmentC = await prisma.accessAssignment.create({
    data: {
      userId: staffPublic.id,
      systemName: "Student Records",
      effectiveRole: "Data Viewer",
      grantedById: approver.id,
      isPrivileged: false,
      grantedAt: new Date(Date.now() - 1000 * 60 * 60 * 180),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45),
    },
  });

  const reviewDue = await prisma.accessReview.create({
    data: {
      reviewOwnerId: auditor.id,
      title: "Quarterly Privileged Access Certification",
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6),
      status: ReviewStatus.DUE,
    },
  });

  const reviewOverdue = await prisma.accessReview.create({
    data: {
      reviewOwnerId: auditor.id,
      title: "Dormant Account Validation",
      dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      status: ReviewStatus.OVERDUE,
    },
  });

  await prisma.accessReviewItem.createMany({
    data: [
      {
        reviewId: reviewDue.id,
        assignmentId: assignmentA.id,
        reviewerId: auditor.id,
      },
      {
        reviewId: reviewDue.id,
        assignmentId: assignmentB.id,
        reviewerId: auditor.id,
      },
      {
        reviewId: reviewOverdue.id,
        assignmentId: assignmentC.id,
        reviewerId: securityAdmin.id,
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        actorUserId: staffPrivate.id,
        action: AuditActionType.LOGIN_SUCCESS,
        targetType: "AUTH_SESSION",
        targetId: staffPrivate.id,
        ipAddress: "10.0.1.23",
        userAgent: "Mozilla/5.0",
      },
      {
        actorUserId: staffPublic.id,
        action: AuditActionType.LOGIN_FAILURE,
        targetType: "AUTH_SESSION",
        targetId: staffPublic.id,
        ipAddress: "10.0.1.45",
        userAgent: "Mozilla/5.0",
      },
      {
        actorUserId: staffPublic.id,
        action: AuditActionType.ACCESS_REQUEST_CREATED,
        targetType: "ACCESS_REQUEST",
        targetId: requestA.id,
      },
      {
        actorUserId: approver.id,
        action: AuditActionType.ACCESS_REQUEST_APPROVED,
        targetType: "ACCESS_REQUEST",
        targetId: requestB.id,
      },
      {
        actorUserId: securityAdmin.id,
        action: AuditActionType.ACCESS_REQUEST_REJECTED,
        targetType: "ACCESS_REQUEST",
        targetId: requestC.id,
      },
      {
        actorUserId: auditor.id,
        action: AuditActionType.REVIEW_COMPLETED,
        targetType: "ACCESS_REVIEW",
        targetId: reviewDue.id,
      },
      {
        actorUserId: admin.id,
        action: AuditActionType.ROLE_CHANGED,
        targetType: "USER",
        targetId: securityAdmin.id,
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

