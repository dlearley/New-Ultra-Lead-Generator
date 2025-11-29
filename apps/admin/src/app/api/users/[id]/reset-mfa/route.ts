import { NextRequest, NextResponse } from "next/server";
import { withAdminMiddleware } from "@/middleware/rbac";
import { createAuditLog } from "@/lib/audit";
import { mockUsers } from "@/lib/mock-data";

export const POST = withAdminMiddleware(async (request, context) => {
  const { id } = await request.json().catch(() => ({}));

  if (!id) {
    return NextResponse.json(
      { error: "User ID is required" },
      { status: 400 }
    );
  }

  const user = mockUsers.find((u) => u.id === id);
  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  const log = createAuditLog(context, "RESET_MFA_USER", id, {
    userId: id,
    userName: user.name,
    userEmail: user.email,
    organizationId: user.organizationId,
    timestamp: new Date(),
  });

  return NextResponse.json({
    success: true,
    message: `MFA reset for user: ${user.name}`,
    auditLog: log,
  });
});
