import { NextRequest, NextResponse } from "next/server";
import { withAdminMiddleware } from "@/middleware/rbac";
import { createAuditLog } from "@/lib/audit";
import { mockOrganizations } from "@/lib/mock-data";

export const POST = withAdminMiddleware(async (request, context) => {
  const { id } = await request.json().catch(() => ({}));

  if (!id) {
    return NextResponse.json(
      { error: "Organization ID is required" },
      { status: 400 }
    );
  }

  const organization = mockOrganizations.find((o) => o.id === id);
  if (!organization) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  const log = createAuditLog(context, "IMPERSONATE_ORGANIZATION", id, {
    organizationId: id,
    organizationName: organization.name,
    impersonationStarted: new Date(),
  });

  return NextResponse.json({
    success: true,
    message: `Impersonating organization: ${organization.name}`,
    organization: {
      id: organization.id,
      name: organization.name,
      plan: organization.plan,
    },
    auditLog: log,
  });
});
