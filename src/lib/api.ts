import { CVEDetail, CVESummary, EPSSData } from "./types";

async function fetchAPI<T>(path: string): Promise<T> {
  const res = await fetch(`/api/proxy?path=${encodeURIComponent(path)}`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function getLatestCVEs(page = 1, perPage = 20): Promise<CVESummary[]> {
  return fetchAPI<CVESummary[]>(
    `/vulnerability/?per_page=${perPage}&page=${page}&sort_order=desc&date_sort=published`
  );
}

export async function searchCVEs(params: {
  product?: string;
  cwe?: string;
  since?: string;
  page?: number;
  perPage?: number;
  source?: string;
}): Promise<CVESummary[]> {
  const searchParams = new URLSearchParams();
  if (params.product) searchParams.set("product", params.product);
  if (params.cwe) searchParams.set("cwe", params.cwe);
  if (params.since) searchParams.set("since", params.since);
  if (params.source) searchParams.set("source", params.source);
  searchParams.set("page", String(params.page || 1));
  searchParams.set("per_page", String(params.perPage || 20));
  searchParams.set("sort_order", "desc");
  searchParams.set("date_sort", "published");

  return fetchAPI<CVESummary[]>(`/vulnerability/?${searchParams.toString()}`);
}

export async function getCVEById(id: string): Promise<CVEDetail> {
  return fetchAPI<CVEDetail>(
    `/vulnerability/${encodeURIComponent(id)}?with_meta=true&with_linked=true&with_comments=true`
  );
}

export async function searchByVendorProduct(
  vendor: string,
  product: string,
  page = 1,
  perPage = 20
): Promise<CVESummary[]> {
  return fetchAPI<CVESummary[]>(
    `/vulnerability/search/${encodeURIComponent(vendor)}/${encodeURIComponent(product)}?page=${page}&per_page=${perPage}`
  );
}

export async function getVendors(): Promise<string[]> {
  return fetchAPI<string[]>("/vulnerability/browse/");
}

export async function getVendorProducts(vendor: string): Promise<string[]> {
  return fetchAPI<string[]>(`/vulnerability/browse/${encodeURIComponent(vendor)}`);
}

export async function getEPSS(cveId: string): Promise<EPSSData | null> {
  try {
    const response = await fetchAPI<{ data: { cve: string; epss: string; percentile: string; date?: string }[] }>(
      `/epss/${encodeURIComponent(cveId)}`
    );
    if (!response.data || response.data.length === 0) return null;
    const item = response.data[0];
    return {
      cve: item.cve,
      epss: parseFloat(item.epss),
      percentile: parseFloat(item.percentile),
      date: item.date,
    };
  } catch {
    return null;
  }
}

export async function getCWE(cweId: string): Promise<{ id: string; name: string; description: string } | null> {
  try {
    return await fetchAPI(`/cwe/${encodeURIComponent(cweId)}`);
  } catch {
    return null;
  }
}
