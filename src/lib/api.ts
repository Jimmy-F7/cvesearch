import { CVEDetail } from "./types";
import { parseCVEDetail, parseStringList } from "./validation";
import {
  buildVendorProductsPath,
  buildVendorsPath,
  fetchVulnerabilityAPIProxy,
} from "./vulnerability-api-shared";

async function fetchAPI<T>(path: string): Promise<T> {
  return fetchVulnerabilityAPIProxy<T>(path);
}

export async function getCVEById(id: string): Promise<CVEDetail> {
  const res = await fetch(`/api/cve/${encodeURIComponent(id)}`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json().catch(() => null);
  return parseCVEDetail(data);
}

export async function getVendors(): Promise<string[]> {
  const data = await fetchAPI<unknown>(buildVendorsPath());
  return parseStringList(data, "vendors");
}

export async function getVendorProducts(vendor: string): Promise<string[]> {
  const data = await fetchAPI<unknown>(buildVendorProductsPath(vendor));
  return parseStringList(data, "vendor products");
}
