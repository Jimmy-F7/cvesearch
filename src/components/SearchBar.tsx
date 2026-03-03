"use client";

import { useState, useCallback } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
  loading?: boolean;
}

export default function SearchBar({ onSearch, initialQuery = "", loading }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onSearch(query.trim());
    },
    [query, onSearch]
  );

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          {loading ? (
            <svg className="h-5 w-5 animate-spin text-cyan-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg
              className="h-5 w-5 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by CVE ID (e.g. CVE-2024-1234) or keyword..."
          className="h-14 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] pl-12 pr-28 text-base text-white placeholder-gray-500 outline-none transition-all focus:border-cyan-500/50 focus:bg-white/[0.05] focus:ring-1 focus:ring-cyan-500/30"
        />
        <button
          type="submit"
          disabled={loading}
          className="absolute inset-y-2 right-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-5 text-sm font-medium text-white shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-500 hover:to-blue-500 hover:shadow-cyan-500/30 disabled:opacity-50"
        >
          Search
        </button>
      </div>
    </form>
  );
}
