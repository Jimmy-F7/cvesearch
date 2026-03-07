"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createProjectAPI, deleteProjectAPI, listProjectsAPI, removeProjectItemAPI } from "@/lib/projects-api";
import { getCVEById } from "@/lib/api";
import { ProjectRecord, CVESummary } from "@/lib/types";
import CVEList from "./CVEList";
import AIProjectSummaryPanel from "./AIProjectSummaryPanel";

type ProjectDetails = Record<string, CVESummary[]>;

export default function ProjectsPageClient() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [details, setDetails] = useState<ProjectDetails>({});
  const [loading, setLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState("");
  const [busy, setBusy] = useState<"create" | "delete" | "remove-item" | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const projectList = await listProjectsAPI().catch((error: unknown) => {
        setFeedback({
          type: "error",
          message: error instanceof Error ? error.message : "Failed to load projects.",
        });
        return [];
      });
      if (cancelled) return;

      setProjects(projectList);

      const nextDetails: ProjectDetails = {};
      for (const project of projectList) {
        const items = await Promise.all(
          project.items.slice(0, 10).map(async (item) => {
            try {
              return await getCVEById(item.cveId);
            } catch {
              return null;
            }
          })
        );
        nextDetails[project.id] = items.filter(Boolean) as CVESummary[];
      }

      if (!cancelled) {
        setDetails(nextDetails);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDeleteProject(projectId: string) {
    setBusy("delete");
    try {
      await deleteProjectAPI(projectId);
      setProjects((current) => current.filter((project) => project.id !== projectId));
      setDetails((current) => {
        const next = { ...current };
        delete next[projectId];
        return next;
      });
      setFeedback({ type: "success", message: "Project deleted." });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Failed to delete project." });
    } finally {
      setBusy(null);
    }
  }

  async function handleRemoveItem(projectId: string, cveId: string) {
    setBusy("remove-item");
    try {
      const updated = await removeProjectItemAPI(projectId, cveId);
      setProjects((current) => current.map((project) => (project.id === updated.id ? updated : project)));
      setDetails((current) => ({
        ...current,
        [projectId]: (current[projectId] ?? []).filter((item) => item.id !== cveId),
      }));
      setFeedback({ type: "success", message: `${cveId} removed from the project.` });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Failed to remove CVE from project." });
    } finally {
      setBusy(null);
    }
  }

  async function handleCreateProject() {
    if (!newProjectName.trim()) return;
    setBusy("create");
    try {
      const project = await createProjectAPI({ name: newProjectName.trim() });
      setProjects((current) => [project, ...current]);
      setDetails((current) => ({ ...current, [project.id]: [] }));
      setNewProjectName("");
      setFeedback({ type: "success", message: `Created ${project.name}.` });
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Failed to create project." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="app-shell px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Projects</h1>
          <p className="mt-2 text-base text-gray-500">Server-persisted project groupings for CVEs in this workspace.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={newProjectName}
            onChange={(event) => setNewProjectName(event.target.value)}
            placeholder="New project name"
            className="min-w-56 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-gray-600 outline-none"
          />
          <button
            type="button"
            onClick={() => void handleCreateProject()}
            disabled={busy !== null || !newProjectName.trim()}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {busy === "create" ? "Creating..." : "Create Project"}
          </button>
          <Link href="/" className="inline-flex rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white">
            Back to Search
          </Link>
        </div>
      </div>

      {feedback && (
        <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${feedback.type === "error" ? "border-red-500/20 bg-red-500/10 text-red-200" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"}`}>
          {feedback.message}
        </div>
      )}

      {projects.length === 0 && !loading ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-10 text-center">
          <p className="text-lg font-medium text-white">No projects yet</p>
          <p className="mt-2 text-sm text-gray-500">Create a project here or add a CVE to one from search results or the detail view.</p>
        </div>
      ) : loading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="h-7 w-48 rounded bg-white/[0.06]" />
              <div className="mt-3 h-4 w-64 rounded bg-white/[0.04]" />
              <div className="mt-6 space-y-3">
                <div className="h-20 rounded-xl bg-white/[0.03]" />
                <div className="h-20 rounded-xl bg-white/[0.03]" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {projects.map((project) => (
            <section key={project.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white">{project.name}</h2>
                  {project.description && <p className="mt-1 text-sm text-gray-400">{project.description}</p>}
                  <p className="mt-2 text-xs text-gray-500">
                    {project.items.length} CVEs • Updated {new Date(project.updatedAt).toLocaleString("en-US")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDeleteProject(project.id)}
                  disabled={busy !== null}
                  className="rounded-lg border border-red-500/20 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                >
                  Delete Project
                </button>
              </div>

              {project.items.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {project.items.slice(0, 12).map((item) => (
                    <button
                      key={item.cveId}
                      type="button"
                      onClick={() => void handleRemoveItem(project.id, item.cveId)}
                      disabled={busy !== null}
                      className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-xs text-gray-300 hover:bg-white/[0.06] disabled:opacity-50"
                    >
                      {item.cveId} ×
                    </button>
                  ))}
                </div>
              )}

              {project.activity.length > 0 && (
                <div className="mb-4 rounded-xl border border-white/[0.06] bg-black/10 p-4">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500">Recent activity</h3>
                  <div className="mt-3 space-y-2">
                    {project.activity.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="flex items-start justify-between gap-3 text-sm">
                        <p className="text-gray-300">{entry.summary}</p>
                        <span className="shrink-0 text-[11px] text-gray-500">
                          {new Date(entry.createdAt).toLocaleString("en-US")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <AIProjectSummaryPanel projectId={project.id} />

              <CVEList
                cves={details[project.id] ?? []}
                loading={loading}
                skeletonCount={3}
                emptyTitle="No CVE previews loaded yet"
                emptyBody="Add more CVEs to this project or open them from search to populate the project workspace."
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
