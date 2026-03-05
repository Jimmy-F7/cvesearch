import { SearchFilters } from "./types";
import { CVESummary, SearchSeverityFilter } from "./types";
import { extractPublishedDate, getSeverityFromScore } from "./utils";

export const DEFAULT_PAGE = 1;
export const PER_PAGE = 20;
export const DEFAULT_MIN_SEVERITY: SearchSeverityFilter = "ANY";
export const DEFAULT_SORT = "published_desc";

export type SearchState = SearchFilters;

type SearchParamValue = string | string[] | undefined;

export function normalizeSearchValue(value: SearchParamValue): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parsePositiveInt(value: SearchParamValue, fallback = DEFAULT_PAGE): number {
  const parsed = Number.parseInt(normalizeSearchValue(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeSearchState(input: Partial<SearchState>): SearchState {
  return {
    query: input.query?.trim() || "",
    vendor: input.vendor?.trim() || "",
    product: input.product?.trim() || "",
    cwe: input.cwe?.trim() || "",
    since: input.since?.trim() || "",
    minSeverity: normalizeSeverityFilter(input.minSeverity),
    sort: normalizeSortOption(input.sort),
    page: input.page && input.page > 0 ? input.page : DEFAULT_PAGE,
    perPage: input.perPage && input.perPage > 0 ? input.perPage : PER_PAGE,
  };
}

export function parseSearchState(searchParams: Record<string, SearchParamValue>): SearchState {
  return normalizeSearchState({
    query: normalizeSearchValue(searchParams.query),
    vendor: normalizeSearchValue(searchParams.vendor),
    product: normalizeSearchValue(searchParams.product),
    cwe: normalizeSearchValue(searchParams.cwe),
    since: normalizeSearchValue(searchParams.since),
    minSeverity: normalizeSearchValue(searchParams.minSeverity) as SearchSeverityFilter,
    sort: normalizeSearchValue(searchParams.sort) as SearchState["sort"],
    page: parsePositiveInt(searchParams.page, DEFAULT_PAGE),
    perPage: PER_PAGE,
  });
}

export function buildSearchParams(state: Partial<SearchState>): URLSearchParams {
  const normalized = normalizeSearchState(state);
  const params = new URLSearchParams();

  if (normalized.query) params.set("query", normalized.query);
  if (normalized.vendor) params.set("vendor", normalized.vendor);
  if (normalized.product) params.set("product", normalized.product);
  if (normalized.cwe) params.set("cwe", normalized.cwe);
  if (normalized.since) params.set("since", normalized.since);
  if (normalized.minSeverity !== DEFAULT_MIN_SEVERITY) params.set("minSeverity", normalized.minSeverity);
  if (normalized.sort !== DEFAULT_SORT) params.set("sort", normalized.sort);
  if (normalized.page > DEFAULT_PAGE) params.set("page", String(normalized.page));

  return params;
}

export function isCveIdQuery(query: string): boolean {
  return /^CVE-\d{4}-\d+$/i.test(query.trim());
}

export function hasActiveFilters(state: SearchState): boolean {
  return Boolean(
    state.vendor ||
      state.product ||
      state.cwe ||
      state.since ||
      state.minSeverity !== DEFAULT_MIN_SEVERITY ||
      state.sort !== DEFAULT_SORT
  );
}

export function getSearchValidationError(state: SearchState): string | null {
  if (state.vendor && !state.product) {
    return "Vendor filtering currently requires a product. Add a product or clear the vendor filter.";
  }

  return null;
}

export function getSearchSummary(state: SearchState): string {
  if (state.query) {
    return `Results for "${state.query}"`;
  }

  if (hasActiveFilters(state)) {
    return "Filtered vulnerabilities";
  }

  return "Latest vulnerabilities";
}

export function applySearchResultPreferences(cves: CVESummary[], state: SearchState): CVESummary[] {
  const filtered = cves.filter((cve) => matchesSeverityFilter(cve, state.minSeverity));

  return filtered.sort((left, right) => compareCVEs(left, right, state.sort));
}

function matchesSeverityFilter(cve: CVESummary, minSeverity: SearchSeverityFilter): boolean {
  if (minSeverity === "ANY") return true;

  const score = cve.cvss3 ?? cve.cvss;
  const severity = getSeverityFromScore(score);
  const rank = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4, NONE: 0, UNKNOWN: 0 };

  return rank[severity] >= rank[minSeverity];
}

function compareCVEs(left: CVESummary, right: CVESummary, sort: SearchState["sort"]): number {
  if (sort === "cvss_desc") {
    return scoreForSort(right) - scoreForSort(left);
  }

  if (sort === "cvss_asc") {
    return scoreForSort(left) - scoreForSort(right);
  }

  const leftPublished = publishedForSort(left);
  const rightPublished = publishedForSort(right);

  if (sort === "published_asc") {
    return leftPublished - rightPublished;
  }

  return rightPublished - leftPublished;
}

function scoreForSort(cve: CVESummary): number {
  return cve.cvss3 ?? cve.cvss ?? -1;
}

function publishedForSort(cve: CVESummary): number {
  const published = extractPublishedDate(cve);
  if (!published) return 0;

  const parsed = new Date(published).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSeverityFilter(value: SearchState["minSeverity"] | undefined): SearchState["minSeverity"] {
  const allowed: SearchSeverityFilter[] = ["ANY", "LOW", "MEDIUM", "HIGH", "CRITICAL"];
  return value && allowed.includes(value) ? value : DEFAULT_MIN_SEVERITY;
}

function normalizeSortOption(value: SearchState["sort"] | undefined): SearchState["sort"] {
  const allowed: SearchState["sort"][] = ["published_desc", "published_asc", "cvss_desc", "cvss_asc"];
  return value && allowed.includes(value) ? value : DEFAULT_SORT;
}
