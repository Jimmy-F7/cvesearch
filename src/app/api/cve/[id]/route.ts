import { NextRequest, NextResponse } from "next/server";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";
import { getCVEByIdServer } from "@/lib/server-api";

export const GET = withRouteProtection(async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const decodedId = decodeURIComponent(id);
  const cve = await getCVEByIdServer(decodedId);
  return NextResponse.json(cve);
}, {
  route: "/api/cve/[id]",
  errorMessage: "Failed to load CVE detail",
  rateLimit: API_RATE_LIMITS.proxy,
});
