import { CVEDetail, CVESummary, CWEData, EPSSData } from "./types";
import {
  parseCVEDetail,
  parseCVESummaryList,
  parseCWEData,
  parseEPSSResponse,
  parseStringList,
} from "./validation";
import {
  buildCVEDetailPath,
  buildCWEPath,
  buildEPSSPath,
  buildLatestCVEsPath,
  buildSearchCVEsPath,
  buildVendorProductsPath,
  buildVendorProductSearchPath,
  buildVendorsPath,
  fetchVulnerabilityAPIProxy,
  buildProxyRequestPath,
} from "./vulnerability-api";

async function fetchAPI<T>(path: string): Promise<T> {
  return fetchVulnerabilityAPIProxy<T>(path);
}

export async function getLatestCVEs(page = 1, perPage = 20): Promise<CVESummary[]> {
  const data = await fetchAPI<unknown>(buildLatestCVEsPath(page, perPage));
  return parseCVESummaryList(data);
}

export async function searchCVEs(params: {
  product?: string;
  cwe?: string;
  since?: string;
  page?: number;
  perPage?: number;
  source?: string;
}): Promise<CVESummary[]> {
  const data = await fetchAPI<unknown>(buildSearchCVEsPath({
    product: params.product,
    cwe: params.cwe,
    since: params.since,
    source: params.source,
    page: params.page || 1,
    perPage: params.perPage || 20,
  }));
  return parseCVESummaryList(data);
}

export async function getCVEById(id: string): Promise<CVEDetail> {
  const data = await fetchAPI<unknown>(buildCVEDetailPath(id));
  return parseCVEDetail(data);
}

export async function searchByVendorProduct(
  vendor: string,
  product: string,
  page = 1,
  perPage = 20
): Promise<CVESummary[]> {
  const data = await fetchAPI<unknown>(buildVendorProductSearchPath(vendor, product, page, perPage));
  return parseCVESummaryList(data);
}

export async function getVendors(): Promise<string[]> {
  const data = await fetchAPI<unknown>(buildVendorsPath());
  return parseStringList(data, "vendors");
}

export async function getVendorProducts(vendor: string): Promise<string[]> {
  const data = await fetchAPI<unknown>(buildVendorProductsPath(vendor));
  return parseStringList(data, "vendor products");
}

export async function getEPSS(cveId: string): Promise<EPSSData | null> {
  try {
    const response = await fetchAPI<unknown>(buildEPSSPath(cveId));
    return parseEPSSResponse(response);
  } catch {
    return null;
  }
}

export async function getEPSSQuietly(cveId: string): Promise<EPSSData | null> {
  try {
    const res = await fetch(buildProxyRequestPath(buildEPSSPath(cveId)), {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return null;
    }

    const response = await res.json().catch(() => null);
    return parseEPSSResponse(response);
  } catch {
    return null;
  }
}

export async function getCWE(cweId: string): Promise<CWEData | null> {
  try {
    const data = await fetchAPI<unknown>(buildCWEPath(cweId));
    return parseCWEData(data);
  } catch {
    return null;
  }
}
