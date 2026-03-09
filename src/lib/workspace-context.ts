import type { DigestInput } from "./ai-service";
import { applySearchResultPreferences, matchesSearchState } from "./search";
import { getLatestCVEsServer } from "./server-api";
import { TriageRecord } from "./triage-shared";
import { ProjectRecord, CVESummary } from "./types";
import { AlertRule, SavedView } from "./workspace-types";
import {
  listAlertRulesForUser,
  listSavedViewsForUser,
  listWatchlistEntriesForUser,
  readTriageMapForUser,
} from "./workspace-store";
import { listProjects } from "./projects-store";

const WORKSPACE_ALERT_SAMPLE_SIZE = 80;

export interface EvaluatedAlertRule {
  rule: AlertRule;
  matching: CVESummary[];
  unread: number;
}

export interface WorkspaceContextSnapshot {
  watchlist: Array<{ cveId: string; addedAt: string }>;
  savedViews: SavedView[];
  alertRules: AlertRule[];
  alertEvaluations: EvaluatedAlertRule[];
  triage: Record<string, TriageRecord>;
  projects: ProjectRecord[];
  latestSample: CVESummary[];
}

export interface AlertEvaluationsSnapshot {
  evaluations: EvaluatedAlertRule[];
  sampledCount: number;
}

export async function loadWorkspaceContextSnapshot(userId: string): Promise<WorkspaceContextSnapshot> {
  const [watchlist, savedViews, alertRules, triage, projects, latestSample] = await Promise.all([
    listWatchlistEntriesForUser(userId),
    listSavedViewsForUser(userId),
    listAlertRulesForUser(userId),
    readTriageMapForUser(userId),
    listProjects(userId),
    getLatestCVEsServer(1, WORKSPACE_ALERT_SAMPLE_SIZE).catch(() => []),
  ]);

  const alertEvaluations = alertRules.map((rule) => {
    const matching = applySearchResultPreferences(
      latestSample.filter((cve) => matchesSearchState(cve, rule.search)),
      rule.search
    );

    return {
      rule,
      matching,
      unread: matching.filter((cve) => isUnreadMatch(cve, rule.lastCheckedAt)).length,
    };
  });

  return {
    watchlist,
    savedViews,
    alertRules,
    alertEvaluations,
    triage,
    projects,
    latestSample,
  };
}

export async function loadAlertEvaluationsForUser(userId: string): Promise<AlertEvaluationsSnapshot> {
  const snapshot = await loadWorkspaceContextSnapshot(userId);
  return {
    evaluations: snapshot.alertEvaluations,
    sampledCount: snapshot.latestSample.length,
  };
}

export function buildDigestInputFromWorkspaceSnapshot(snapshot: WorkspaceContextSnapshot): DigestInput {
  return {
    watchlist: snapshot.watchlist.map((item) => ({ id: item.cveId })),
    alerts: snapshot.alertEvaluations.map((item) => ({
      name: item.rule.name,
      unread: item.unread,
      topMatches: item.matching.slice(0, 3).map((match) => match.id),
    })),
    projects: snapshot.projects.map((project) => ({
      name: project.name,
      items: project.items,
      updatedAt: project.updatedAt,
    })),
  };
}

function isUnreadMatch(cve: CVESummary, lastCheckedAt: string | null): boolean {
  if (!lastCheckedAt) return true;

  const modified = cve.modified ?? cve.published;
  if (!modified) return false;

  const modifiedTs = Date.parse(modified);
  const checkedTs = Date.parse(lastCheckedAt);
  if (Number.isNaN(modifiedTs) || Number.isNaN(checkedTs)) {
    return true;
  }

  return modifiedTs > checkedTs;
}
