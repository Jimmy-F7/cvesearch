"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { deleteProjectAPI, listProjectsAPI, removeProjectItemAPI } from "@/lib/projects-api";
import { getCVEById } from "@/lib/api";
import { ProjectRecord, CVESummary } from "@/lib/types";
import CVEList from "./CVEList";

type ProjectDetails = Record<string, CVESummary[]>;

export default function ProjectsPageClient() {
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [details, setDetails] = useState<ProjectDetails>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const projectList = await listProjectsAPI().catch(() => []);
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
    await deleteProjectAPI(projectId);
    setProjects((current) => current.filter((project) => project.id !== projectId));
    setDetails((current) => {
      const next = { ...current };
      delete next[projectId];
      return next;
    });
  }

  async function handleRemoveItem(projectId: string, cveId: string) {
    const updated = await removeProjectItemAPI(projectId, cveId);
    setProjects((current) => current.map((project) => (project.id === updated.id ? updated : project)));
    setDetails((current) => ({
      ...current,
      [projectId]: (current[projectId] ?? []).filter((item) => item.id !== cveId),
    }));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Projects</h1>
          <p className="mt-2 text-base text-gray-500">Server-persisted project groupings for CVEs in this workspace.</p>
        </div>
        <Link href="/" className="inline-flex rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white">
          Back to Search
        </Link>
      </div>

      {projects.length === 0 && !loading ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-6 py-10 text-center text-gray-500">
          No projects yet. Add a CVE to a project from search results or the detail page.
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
                  onClick={() => handleDeleteProject(project.id)}
                  className="rounded-lg border border-red-500/20 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
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
                      onClick={() => handleRemoveItem(project.id, item.cveId)}
                      className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-xs text-gray-300 hover:bg-white/[0.06]"
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

              <CVEList cves={details[project.id] ?? []} loading={loading} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
