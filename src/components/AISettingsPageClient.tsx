"use client";

import { useState } from "react";
import Link from "next/link";
import { AIProvider, AISettings } from "@/lib/types";
import { getDefaultAISettings, readAISettings, writeAISettings } from "@/lib/ai-settings";

export default function AISettingsPageClient() {
  const [settings, setSettings] = useState<AISettings>(() => {
    const storedSettings = readAISettings();
    return storedSettings.provider === "heuristic" && !storedSettings.model && !storedSettings.apiKey
      ? getDefaultAISettings()
      : storedSettings;
  });
  const [saved, setSaved] = useState(false);

  function update<K extends keyof AISettings>(key: K, value: AISettings[K]) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
    setSaved(false);
  }

  function handleSave() {
    writeAISettings(settings);
    setSaved(true);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">AI Settings</h1>
          <p className="mt-2 text-base text-gray-500">Configure provider, model, and API key for browser-local AI features.</p>
        </div>
        <Link href="/" className="inline-flex rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white">
          Back to Search
        </Link>
      </div>

      <div className="space-y-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">Provider</span>
          <select
            value={settings.provider}
            onChange={(event) => update("provider", event.target.value as AIProvider)}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
          >
            <option value="heuristic">Heuristic fallback</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">Model</span>
          <input
            type="text"
            value={settings.model}
            onChange={(event) => update("model", event.target.value)}
            placeholder={settings.provider === "anthropic" ? "claude-3-5-haiku-latest" : "gpt-4.1-mini"}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">API Key</span>
          <input
            type="password"
            value={settings.apiKey}
            onChange={(event) => update("apiKey", event.target.value)}
            placeholder={settings.provider === "heuristic" ? "Not required for heuristic mode" : "Paste provider API key"}
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-gray-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
          />
        </label>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          These settings are stored in browser local storage. They are not encrypted and are not synced across devices.
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-gray-500">{saved ? "Saved locally." : "Changes are local to this browser."}</span>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
