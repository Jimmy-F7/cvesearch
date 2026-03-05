"use client";

import { useEffect, useState } from "react";
import {
  addProjectItemAPI,
  createProjectAPI,
  listProjectsAPI,
} from "@/lib/projects-api";
import { ProjectRecord } from "@/lib/types";

export default function ProjectPickerButton({ cveId }: { cveId: string }) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    listProjectsAPI()
      .then(setProjects)
      .catch(() => setProjects([]));
  }, [open]);

  async function handleCreateProject() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const project = await createProjectAPI({ name });
      setProjects((current) => [project, ...current]);
      setName("");
      setMessage(`Created ${project.name}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd(projectId: string) {
    setBusy(true);
    try {
      const project = await addProjectItemAPI(projectId, { cveId });
      setProjects((current) => current.map((entry) => (entry.id === project.id ? project : entry)));
      setMessage("Added to project");
      setTimeout(() => setOpen(false), 300);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className="inline-flex h-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-gray-300 transition-colors hover:text-white"
      >
        Projects
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-20 w-80 rounded-2xl border border-white/[0.08] bg-[#11131a] p-4 shadow-2xl shadow-black/40">
          <div className="mb-3">
            <div className="text-sm font-semibold text-white">Add {cveId} to project</div>
            <p className="mt-1 text-xs text-gray-500">Projects are persisted server-side in this app workspace.</p>
          </div>

          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="New project name"
              className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-gray-600 outline-none"
            />
            <button
              type="button"
              onClick={handleCreateProject}
              disabled={busy}
              className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
            >
              Create
            </button>
          </div>

          <div className="max-h-64 space-y-2 overflow-auto">
            {projects.length === 0 ? (
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-4 text-sm text-gray-500">
                No projects yet.
              </div>
            ) : (
              projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => handleAdd(project.id)}
                  disabled={busy}
                  className="block w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-left transition-colors hover:bg-white/[0.05] disabled:opacity-50"
                >
                  <div className="text-sm font-medium text-white">{project.name}</div>
                  <div className="mt-1 text-xs text-gray-500">{project.items.length} CVEs</div>
                </button>
              ))
            )}
          </div>

          {message && <div className="mt-3 text-xs text-cyan-300">{message}</div>}
        </div>
      )}
    </div>
  );
}
