import { NextRequest, NextResponse } from "next/server";
import { withAdminMiddleware } from "@/middleware/rbac";
import { createAuditLog } from "@/lib/audit";
import { mockUsers } from "@/lib/mock-data";

export const POST = withAdminMiddleware(async (request, context) => {
  const { id } = await request.json().catch(() => ({}));

  if (!id) {
    return NextResponse.json(
      { error: "Organization ID is required" },
      { status: 400 }
    );
  }

  const affectedUsers = mockUsers.filter((u) => u.organizationId === id);

  const log = createAuditLog(context, "RESET_MFA_ORGANIZATION", id, {
    organizationId: id,
    affectedUserCount: affectedUsers.length,
    userIds: affectedUsers.map((u) => u.id),
    timestamp: new Date(),
  });

  return NextResponse.json({
    success: true,
    message: `MFA reset for ${affectedUsers.length} users`,
    affectedUserCount: affectedUsers.length,
    auditLog: log,
  });
});
