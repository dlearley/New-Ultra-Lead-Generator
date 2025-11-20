import { NextRequest, NextResponse } from "next/server";
import { withAdminMiddleware } from "@/middleware/rbac";
import { createAuditLog } from "@/lib/audit";

export const POST = withAdminMiddleware(async (request, context) => {
  const { id } = await request.json().catch(() => ({}));

  if (!id) {
    return NextResponse.json(
      { error: "Organization ID is required" },
      { status: 400 }
    );
  }

  const log = createAuditLog(context, "SUSPEND_ORGANIZATION", id, {
    organizationId: id,
    timestamp: new Date(),
  });

  return NextResponse.json({
    success: true,
    message: "Organization suspended",
    auditLog: log,
  });
});
