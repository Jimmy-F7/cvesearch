import { NextRequest, NextResponse } from "next/server";
import { getCVEByIdServer } from "@/lib/server-api";
import { generateCveInsight } from "@/lib/ai";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const detail = await getCVEByIdServer(decodeURIComponent(id));
    const insight = await generateCveInsight(detail, body?.settings);
    return NextResponse.json(insight);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate AI CVE insight" },
      { status: 500 }
    );
  }
}
