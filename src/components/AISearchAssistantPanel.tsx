"use client";

import { useState } from "react";
import { SearchState } from "@/lib/search";
import { readAISettings } from "@/lib/ai-settings";

interface AISearchAssistantPanelProps {
  onApply: (next: Partial<SearchState>) => void;
}

export default function AISearchAssistantPanel({ onApply }: AISearchAssistantPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleInterpret() {
    if (!prompt.trim()) return;

    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, settings: readAISettings() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to interpret search");
      }

      onApply(data);
      setMessage(data.explanation || "Applied AI-generated filters.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to interpret search");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">AI Search Assistant</h2>
          <p className="mt-1 text-sm text-gray-500">Use natural language like “show me critical OpenSSL vulns from this month”.</p>
        </div>
        <div className="flex w-full flex-col gap-2 lg:w-2/3">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={2}
            placeholder="Show me recent critical vulnerabilities affecting OpenSSL"
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-500">{message}</span>
            <button
              type="button"
              onClick={handleInterpret}
              disabled={loading}
              className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "Thinking..." : "Apply AI Search"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
