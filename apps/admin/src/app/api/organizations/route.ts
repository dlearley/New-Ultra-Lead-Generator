import { NextRequest, NextResponse } from "next/server";
import { withAdminMiddleware } from "@/middleware/rbac";
import { mockOrganizations } from "@/lib/mock-data";

export const GET = withAdminMiddleware(async (request, context) => {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");

  let orgs = mockOrganizations;

  if (status) {
    orgs = orgs.filter((org) => org.status === status);
  }

  return NextResponse.json({
    success: true,
    data: orgs,
    count: orgs.length,
  });
});
