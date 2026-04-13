-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'SECURITY_ADMIN', 'APPROVER', 'AUDITOR', 'STAFF');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROVISIONED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DUE', 'COMPLETED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "AuditActionType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'MFA_CHALLENGE', 'ACCESS_REQUEST_CREATED', 'ACCESS_REQUEST_APPROVED', 'ACCESS_REQUEST_REJECTED', 'ACCOUNT_DEACTIVATED', 'ROLE_CHANGED', 'REVIEW_COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "institutionType" "InstitutionType" NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "requestedRole" TEXT NOT NULL,
    "businessJustify" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestApproval" (
    "id" TEXT NOT NULL,
    "accessRequestId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "decision" "RequestStatus" NOT NULL,
    "note" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "systemName" TEXT NOT NULL,
    "effectiveRole" TEXT NOT NULL,
    "grantedById" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "isPrivileged" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sourceRequestId" TEXT,

    CONSTRAINT "AccessAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessReview" (
    "id" TEXT NOT NULL,
    "reviewOwnerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DUE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AccessReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessReviewItem" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "keepAccess" BOOLEAN,
    "comment" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "AccessReviewItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" "AuditActionType" NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "RequestApproval_accessRequestId_idx" ON "RequestApproval"("accessRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "AccessAssignment_sourceRequestId_key" ON "AccessAssignment"("sourceRequestId");

-- CreateIndex
CREATE INDEX "AccessAssignment_userId_systemName_idx" ON "AccessAssignment"("userId", "systemName");

-- CreateIndex
CREATE UNIQUE INDEX "AccessReviewItem_reviewId_assignmentId_key" ON "AccessReviewItem"("reviewId", "assignmentId");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestApproval" ADD CONSTRAINT "RequestApproval_accessRequestId_fkey" FOREIGN KEY ("accessRequestId") REFERENCES "AccessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestApproval" ADD CONSTRAINT "RequestApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessAssignment" ADD CONSTRAINT "AccessAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessAssignment" ADD CONSTRAINT "AccessAssignment_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessAssignment" ADD CONSTRAINT "AccessAssignment_sourceRequestId_fkey" FOREIGN KEY ("sourceRequestId") REFERENCES "AccessRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessReview" ADD CONSTRAINT "AccessReview_reviewOwnerId_fkey" FOREIGN KEY ("reviewOwnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessReviewItem" ADD CONSTRAINT "AccessReviewItem_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "AccessReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessReviewItem" ADD CONSTRAINT "AccessReviewItem_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AccessAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessReviewItem" ADD CONSTRAINT "AccessReviewItem_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
