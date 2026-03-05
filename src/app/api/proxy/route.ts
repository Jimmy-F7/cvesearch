import { NextRequest, NextResponse } from "next/server";

const API_BASE = "https://vulnerability.circl.lu/api";
const REQUEST_TIMEOUT_MS = 10_000;
const ALLOWED_PATH_PATTERNS = [
  /^\/vulnerability\/\?(.*)$/u,
  /^\/vulnerability\/[A-Za-z0-9._:-]+(\?.*)?$/u,
  /^\/vulnerability\/search\/[^/]+\/[^/]+(\?.*)?$/u,
  /^\/vulnerability\/browse\/?$/u,
  /^\/vulnerability\/browse\/[^/]+\/?$/u,
  /^\/epss\/[A-Za-z0-9._:-]+$/u,
  /^\/cwe\/[A-Za-z0-9._:-]+$/u,
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Missing path parameter" }, { status: 400 });
  }

  if (!isAllowedPath(path)) {
    return NextResponse.json({ error: "Unsupported upstream path" }, { status: 400 });
  }

  // Build the target URL: path already includes leading slash
  const targetUrl = `${API_BASE}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(targetUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "CVESearch-WebApp/1.0",
      },
      next: { revalidate: 60 },
      signal: controller.signal,
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
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Upstream request timed out" },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Proxy error" },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}

function isAllowedPath(path: string): boolean {
  return ALLOWED_PATH_PATTERNS.some((pattern) => pattern.test(path));
}
