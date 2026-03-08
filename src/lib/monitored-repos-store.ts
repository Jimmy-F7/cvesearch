import { MonitoredRepo } from "./github-types";
import { getDb, withTransaction } from "./db";

export const listMonitoredRepos = async (): Promise<MonitoredRepo[]> => {
  const rows = getDb().prepare(`
    SELECT
      id,
      github_id as githubId,
      full_name as fullName,
      html_url as htmlUrl,
      is_private as isPrivate,
      default_branch as defaultBranch,
      added_at as addedAt,
      last_scanned_at as lastScannedAt,
      last_scan_vulnerability_count as lastScanVulnerabilityCount
    FROM monitored_repos
    ORDER BY added_at DESC
  `).all() as MonitoredRepoRow[];

  return rows.map((row) => normalizeMonitoredRepoRow(row));
};

export const addMonitoredRepo = async (input: {
  githubId: number;
  fullName: string;
  htmlUrl: string;
  isPrivate: boolean;
  defaultBranch: string;
}): Promise<MonitoredRepo> => {
  return withTransaction((db) => {
    const existing = db.prepare(`
      SELECT
        id,
        github_id as githubId,
        full_name as fullName,
        html_url as htmlUrl,
        is_private as isPrivate,
        default_branch as defaultBranch,
        added_at as addedAt,
        last_scanned_at as lastScannedAt,
        last_scan_vulnerability_count as lastScanVulnerabilityCount
      FROM monitored_repos
      WHERE full_name = ?
    `).get(input.fullName) as MonitoredRepoRow | undefined;

    if (existing) {
      return normalizeMonitoredRepoRow(existing);
    }

    const repo: MonitoredRepo = {
      id: crypto.randomUUID(),
      githubId: input.githubId,
      fullName: input.fullName,
      htmlUrl: input.htmlUrl,
      isPrivate: input.isPrivate,
      defaultBranch: input.defaultBranch,
      addedAt: new Date().toISOString(),
      lastScannedAt: null,
      lastScanVulnerabilityCount: null,
    };

    db.prepare(`
      INSERT INTO monitored_repos (
        id,
        github_id,
        full_name,
        html_url,
        is_private,
        default_branch,
        added_at,
        last_scanned_at,
        last_scan_vulnerability_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      repo.id,
      repo.githubId,
      repo.fullName,
      repo.htmlUrl,
      repo.isPrivate ? 1 : 0,
      repo.defaultBranch,
      repo.addedAt,
      repo.lastScannedAt,
      repo.lastScanVulnerabilityCount
    );

    return repo;
  });
};

export const removeMonitoredRepo = async (repoId: string): Promise<boolean> => {
  const result = getDb().prepare("DELETE FROM monitored_repos WHERE id = ?").run(repoId);
  return result.changes > 0;
};

export const updateLastScan = async (
  repoFullName: string,
  vulnerabilityCount: number
): Promise<void> => {
  getDb().prepare(`
    UPDATE monitored_repos
    SET last_scanned_at = ?, last_scan_vulnerability_count = ?
    WHERE full_name = ?
  `).run(new Date().toISOString(), vulnerabilityCount, repoFullName);
};

export const getMonitoredRepo = async (repoIdOrFullName: string): Promise<MonitoredRepo | null> => {
  const row = getDb().prepare(`
    SELECT
      id,
      github_id as githubId,
      full_name as fullName,
      html_url as htmlUrl,
      is_private as isPrivate,
      default_branch as defaultBranch,
      added_at as addedAt,
      last_scanned_at as lastScannedAt,
      last_scan_vulnerability_count as lastScanVulnerabilityCount
    FROM monitored_repos
    WHERE id = ? OR full_name = ?
    LIMIT 1
  `).get(repoIdOrFullName, repoIdOrFullName) as MonitoredRepoRow | undefined;

  return row ? normalizeMonitoredRepoRow(row) : null;
};

interface MonitoredRepoRow {
  id: string;
  githubId: number;
  fullName: string;
  htmlUrl: string;
  isPrivate: number | boolean;
  defaultBranch: string;
  addedAt: string;
  lastScannedAt: string | null;
  lastScanVulnerabilityCount: number | null;
}

function normalizeMonitoredRepoRow(row: MonitoredRepoRow): MonitoredRepo {
  return {
    id: row.id,
    githubId: row.githubId,
    fullName: row.fullName,
    htmlUrl: row.htmlUrl,
    isPrivate: row.isPrivate === true || row.isPrivate === 1,
    defaultBranch: row.defaultBranch,
    addedAt: row.addedAt,
    lastScannedAt: row.lastScannedAt,
    lastScanVulnerabilityCount: row.lastScanVulnerabilityCount,
  };
}
