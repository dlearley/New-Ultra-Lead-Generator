import { NextRequest, NextResponse } from "next/server";

export interface RBACContext {
  userId: string;
  isAdmin: boolean;
}

export function getRBACContext(request: NextRequest): RBACContext | null {
  const adminHeader = request.headers.get("x-admin-user");
  const isAdminHeader = request.headers.get("x-is-admin");

  if (!adminHeader) {
    return null;
  }

  return {
    userId: adminHeader,
    isAdmin: isAdminHeader === "true",
  };
}

export function requireAdmin(request: NextRequest): RBACContext | null {
  const context = getRBACContext(request);

  if (!context || !context.isAdmin) {
    return null;
  }

  return context;
}

export function withAdminMiddleware(
  handler: (
    request: NextRequest,
    context: RBACContext
  ) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest) => {
    const context = requireAdmin(request);

    if (!context) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    return handler(request, context);
  };
}
