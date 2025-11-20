import { NextRequest, NextResponse } from "next/server";
import { withAdminMiddleware } from "@/middleware/rbac";
import { mockUsers } from "@/lib/mock-data";

export const GET = withAdminMiddleware(async (request, context) => {
  const url = new URL(request.url);
  const role = url.searchParams.get("role");
  const orgId = url.searchParams.get("organizationId");

  let users = mockUsers;

  if (role) {
    users = users.filter((user) => user.role === role);
  }

  if (orgId) {
    users = users.filter((user) => user.organizationId === orgId);
  }

  return NextResponse.json({
    success: true,
    data: users,
    count: users.length,
  });
});
