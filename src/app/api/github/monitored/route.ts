import { NextRequest, NextResponse } from "next/server";
import {
  listMonitoredRepos,
  addMonitoredRepo,
  removeMonitoredRepo,
} from "@/lib/monitored-repos-store";
import { API_RATE_LIMITS, withRouteProtection } from "@/lib/api-route-guard";
import { applyWorkspaceSession, getOrCreateWorkspaceSession } from "@/lib/auth-session";

const isRepoFullName = (value: string): boolean => /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value);

export const GET = withRouteProtection(async function GET(request: NextRequest) {
  const session = getOrCreateWorkspaceSession(request);
  try {
    const repos = await listMonitoredRepos(session.userId);
    return applyWorkspaceSession(NextResponse.json(repos), session);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list monitored repos";
    return applyWorkspaceSession(NextResponse.json({ error: message }, { status: 500 }), session);
  }
}, {
  route: "/api/github/monitored",
  errorMessage: "Failed to list monitored repositories",
  rateLimit: API_RATE_LIMITS.githubReads,
});

export const POST = withRouteProtection(async function POST(request: NextRequest) {
  const session = getOrCreateWorkspaceSession(request);
  try {
    const body = await request.json().catch(() => null);
    const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";

    if (!fullName || !isRepoFullName(fullName)) {
      return applyWorkspaceSession(NextResponse.json({ error: "Missing required field: fullName" }, { status: 400 }), session);
    }

    const repo = await addMonitoredRepo(session.userId, {
      githubId: typeof body?.githubId === "number" ? body.githubId : 0,
      fullName,
      htmlUrl: typeof body?.htmlUrl === "string" ? body.htmlUrl : "",
      isPrivate: body?.isPrivate === true,
      defaultBranch: typeof body?.defaultBranch === "string" && body.defaultBranch.trim() ? body.defaultBranch : "main",
    });

    return applyWorkspaceSession(NextResponse.json(repo, { status: 201 }), session);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add monitored repo";
    return applyWorkspaceSession(NextResponse.json({ error: message }, { status: 500 }), session);
  }
}, {
  route: "/api/github/monitored",
  errorMessage: "Failed to add monitored repository",
  rateLimit: API_RATE_LIMITS.githubWrites,
});

export const DELETE = withRouteProtection(async function DELETE(request: NextRequest) {
  const session = getOrCreateWorkspaceSession(request);
  try {
    const { searchParams } = new URL(request.url);
    const repoId = searchParams.get("id");

    if (!repoId) {
      return applyWorkspaceSession(NextResponse.json({ error: "Missing query parameter: id" }, { status: 400 }), session);
    }

    const removed = await removeMonitoredRepo(session.userId, repoId);

    if (!removed) {
      return applyWorkspaceSession(NextResponse.json({ error: "Repo not found" }, { status: 404 }), session);
    }

    return applyWorkspaceSession(NextResponse.json({ success: true }), session);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove monitored repo";
    return applyWorkspaceSession(NextResponse.json({ error: message }, { status: 500 }), session);
  }
}, {
  route: "/api/github/monitored",
  errorMessage: "Failed to remove monitored repository",
  rateLimit: API_RATE_LIMITS.githubWrites,
});
