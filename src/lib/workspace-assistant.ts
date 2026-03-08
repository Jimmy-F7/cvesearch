import { loadWorkspaceContextSnapshot } from "./workspace-context";
import { WorkspaceConversationMessage } from "./workspace-types";

export interface WorkspaceAssistantAnswer {
  message: WorkspaceConversationMessage;
}

export async function answerWorkspaceQuestion(question: string, userId: string): Promise<WorkspaceAssistantAnswer> {
  const trimmed = question.trim();
  const snapshot = await loadWorkspaceContextSnapshot(userId);
  const lower = trimmed.toLowerCase();
  const references: string[] = [];
  const parts: string[] = [];

  if (includesAny(lower, ["overview", "summary", "workspace", "status"]) || parts.length === 0) {
    parts.push(
      `Workspace summary: ${snapshot.watchlist.length} watchlist item${snapshot.watchlist.length === 1 ? "" : "s"}, ${snapshot.alertRules.length} alert rule${snapshot.alertRules.length === 1 ? "" : "s"}, ${snapshot.projects.length} project${snapshot.projects.length === 1 ? "" : "s"}, and ${snapshot.savedViews.length} saved search${snapshot.savedViews.length === 1 ? "" : "es"}.`
    );
    references.push("workspace:summary");
  }

  if (includesAny(lower, ["watchlist", "bookmarks", "tracked"])) {
    const active = snapshot.watchlist.slice(0, 5).map((item) => item.cveId);
    parts.push(
      active.length > 0
        ? `Watchlist focus: ${active.join(", ")}${snapshot.watchlist.length > active.length ? `, plus ${snapshot.watchlist.length - active.length} more.` : "."}`
        : "Watchlist focus: no CVEs are currently bookmarked."
    );
    references.push(...active.map((item) => `watchlist:${item}`));
  }

  if (includesAny(lower, ["alert", "alerts", "unread", "notification"])) {
    const activeAlerts = snapshot.alertEvaluations
      .filter((item) => item.matching.length > 0)
      .slice(0, 3)
      .map((item) => `${item.rule.name} (${item.unread} unread / ${item.matching.length} matches)`);
    parts.push(
      activeAlerts.length > 0
        ? `Alerts needing review: ${activeAlerts.join("; ")}.`
        : "Alerts needing review: the current sample does not produce any active matches."
    );
    references.push(...snapshot.alertEvaluations.slice(0, 3).map((item) => `alert:${item.rule.id}`));
  }

  if (includesAny(lower, ["project", "projects", "owner", "sla", "due", "remediation", "exception"])) {
    const projectHighlights = snapshot.projects.slice(0, 3).map((project) => {
      const overdue = project.items.filter((item) => item.slaDueAt && Date.parse(item.slaDueAt) < Date.now()).length;
      const exceptions = project.items.filter((item) => item.exception?.reason).length;
      const inFlight = project.items.filter((item) => item.remediationState === "in_progress").length;
      return `${project.name} (${project.status ?? "active"}, ${project.items.length} CVEs, ${inFlight} in progress, ${overdue} overdue SLA${overdue === 1 ? "" : "s"}, ${exceptions} exception${exceptions === 1 ? "" : "s"})`;
    });
    parts.push(
      projectHighlights.length > 0
        ? `Project flow: ${projectHighlights.join("; ")}.`
        : "Project flow: no projects are configured yet."
    );
    references.push(...snapshot.projects.slice(0, 3).map((project) => `project:${project.id}`));
  }

  if (includesAny(lower, ["saved", "view", "search", "query"])) {
    const views = snapshot.savedViews.slice(0, 4).map((view) => view.name);
    parts.push(
      views.length > 0
        ? `Saved searches ready to reuse: ${views.join(", ")}.`
        : "Saved searches ready to reuse: none yet."
    );
    references.push(...snapshot.savedViews.slice(0, 4).map((view) => `saved-view:${view.id}`));
  }

  const answer = parts.join(" ");

  return {
    message: {
      id: crypto.randomUUID(),
      role: "assistant",
      content: answer,
      createdAt: new Date().toISOString(),
      references: Array.from(new Set(references)),
    },
  };
}

export function buildUserWorkspaceMessage(question: string): WorkspaceConversationMessage {
  return {
    id: crypto.randomUUID(),
    role: "user",
    content: question.trim(),
    createdAt: new Date().toISOString(),
    references: [],
  };
}

function includesAny(value: string, needles: string[]): boolean {
  return needles.some((needle) => value.includes(needle));
}
