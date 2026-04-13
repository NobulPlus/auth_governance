import { UserRole } from "@prisma/client";

export function canManageRequests(role: UserRole) {
  return role === UserRole.SUPER_ADMIN || role === UserRole.SECURITY_ADMIN || role === UserRole.APPROVER;
}

export function canManageReviews(role: UserRole) {
  return (
    role === UserRole.SUPER_ADMIN ||
    role === UserRole.SECURITY_ADMIN ||
    role === UserRole.AUDITOR ||
    role === UserRole.APPROVER
  );
}

