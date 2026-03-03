import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://vulnerability.circl.lu/api";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  // Build the target URL: path already includes leading slash
  const targetUrl = `${API_BASE}${path}`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "CVESearch-WebApp/1.0",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream API error: ${res.status} ${res.statusText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Proxy error" },
      { status: 502 }
    );
  }
}
