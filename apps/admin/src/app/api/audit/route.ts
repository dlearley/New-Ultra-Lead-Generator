import { NextRequest, NextResponse } from "next/server";
import { withAdminMiddleware } from "@/middleware/rbac";
import { getAuditLogs } from "@/lib/audit";

export const GET = withAdminMiddleware(async (request, context) => {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const actor = url.searchParams.get("actor");
  const target = url.searchParams.get("target");

  const filter = {
    ...(action && { action }),
    ...(actor && { actor }),
    ...(target && { target }),
  };

  const logs = getAuditLogs(Object.keys(filter).length > 0 ? filter : undefined);

  return NextResponse.json({
    success: true,
    data: logs,
    count: logs.length,
  });
});
