"use client";

import { useState, useCallback, useEffect } from "react";
import { CVESummary } from "@/lib/types";
import { getLatestCVEs, searchCVEs, searchByVendorProduct, getCVEById } from "@/lib/api";
import SearchBar from "@/components/SearchBar";
import Filters from "@/components/Filters";
import CVEList from "@/components/CVEList";
import Pagination from "@/components/Pagination";

const PER_PAGE = 20;

export default function Home() {
  const [cves, setCves] = useState<CVESummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ vendor: "", product: "", cwe: "", since: "" });
  const [totalHint, setTotalHint] = useState<string>("");

  const fetchCVEs = useCallback(async (q: string, f: typeof filters, p: number) => {
    setLoading(true);
    setError(null);

    try {
      let results: CVESummary[];
      const isCveId = /^CVE-\d{4}-\d+$/i.test(q.trim());

      if (isCveId) {
        const detail = await getCVEById(q.trim().toUpperCase());
        results = detail ? [detail as unknown as CVESummary] : [];
        setTotalHint("1 result");
      } else if (f.vendor && f.product) {
        results = await searchByVendorProduct(f.vendor, f.product, p, PER_PAGE);
        setTotalHint(`Page ${p}`);
      } else {
        const params: Record<string, string | number> = { page: p, perPage: PER_PAGE };
        if (q) params.product = q;
        if (f.product) params.product = f.product;
        if (f.cwe) params.cwe = f.cwe;
        if (f.since) params.since = f.since;

        const hasSearch = q || f.product || f.cwe || f.since;
        results = hasSearch
          ? await searchCVEs(params)
          : await getLatestCVEs(p, PER_PAGE);
        setTotalHint(`Page ${p}`);
      }

      setCves(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch CVEs");
      setCves([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCVEs(query, filters, page);
  }, [fetchCVEs, query, filters, page]);

  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    setPage(1);
  }, []);

  const handleFilters = useCallback((f: { vendor: string; product: string; cwe: string; since: string }) => {
    setFilters(f);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Hero */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Vulnerability Search
        </h1>
        <p className="mt-2 text-base text-gray-500">
          Search and explore CVE vulnerability records from the global database
        </p>
      </div>

      {/* Search + Filters */}
      <div className="mb-6 space-y-4">
        <SearchBar onSearch={handleSearch} initialQuery={query} loading={loading} />
        <Filters onApply={handleFilters} initialFilters={filters} />
      </div>

      {/* Status Bar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {query && (
            <span>
              Results for <span className="font-medium text-gray-300">&ldquo;{query}&rdquo;</span>
            </span>
          )}
          {!query && !filters.vendor && !filters.product && !filters.cwe && !filters.since && (
            <span>Latest vulnerabilities</span>
          )}
          {totalHint && <span className="text-gray-600">&middot; {totalHint}</span>}
        </div>
        <div className="text-sm text-gray-600">
          {cves.length} shown
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      {/* Results */}
      <CVEList cves={cves} loading={loading} />

      {/* Pagination */}
      {cves.length > 0 && (
        <div className="mt-6">
          <Pagination
            page={page}
            hasMore={cves.length >= PER_PAGE}
            onPageChange={handlePageChange}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}
