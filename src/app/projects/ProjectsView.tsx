"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { mergeItems, projectsStore, useProjects } from "@/components/calc/projects";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { fmtMoney } from "@/lib/format";

export function ProjectsView() {
  const projects = useProjects();
  const [hydrated, setHydrated] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- projects live in localStorage; render after mount
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <div className="grid gap-4" aria-busy="true">
        <div className="skeleton h-40 rounded-[28px]" />
        <div className="skeleton h-40 rounded-[28px]" />
      </div>
    );
  }

  if (!projects.length) {
    return (
      <div className="module p-8 text-center">
        <h2 className="display text-2xl text-ink">No projects yet</h2>
        <p className="mx-auto mt-2 max-w-md text-ink-2">
          Open any calculator, enter your measurements and tap <strong>Save to project</strong>. Everything you save shows up here
          with a combined shopping list.
        </p>
        <Link href="/concrete/slab-calculator" className="mt-6 inline-flex h-11 items-center rounded-full bg-ink px-6 font-semibold text-bg active:scale-95">
          Try the concrete calculator
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {projects.map((p) => {
        const merged = mergeItems(p.calcs);
        const total = merged.reduce((s, i) => s + (i.cost ?? 0), 0);
        return (
          <section key={p.id} className="module p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              {renaming === p.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = new FormData(e.currentTarget).get("name");
                    projectsStore.rename(p.id, String(v ?? ""));
                    setRenaming(null);
                  }}
                  className="flex gap-2"
                >
                  <input name="name" defaultValue={p.name} autoFocus maxLength={60} className="well h-11 px-3 text-lg font-semibold text-ink outline-none" aria-label="Project name" />
                  <button className="h-11 rounded-full bg-ink px-4 text-sm font-semibold text-bg">Save</button>
                </form>
              ) : (
                <h2 className="display text-[1.6rem] text-ink">{p.name}</h2>
              )}
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setRenaming(p.id)} className="h-9 rounded-full bg-surface-2 px-3.5 text-[0.82rem] font-semibold text-ink-2 ring-1 ring-line active:scale-95">
                  Rename
                </button>
                <button type="button" onClick={() => window.print()} className="h-9 rounded-full bg-surface-2 px-3.5 text-[0.82rem] font-semibold text-ink-2 ring-1 ring-line active:scale-95">
                  Print
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete “${p.name}” and its ${p.calcs.length} saved calculations?`)) projectsStore.remove(p.id);
                  }}
                  className="h-9 rounded-full px-3.5 text-[0.82rem] font-semibold text-ink-3 hover:text-bad active:scale-95"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="eyebrow mb-3">Saved calculations ({p.calcs.length})</h3>
                <ul className="space-y-2">
                  {p.calcs.map((c) => (
                    <li key={c.id} className="flex items-start justify-between gap-3 rounded-[16px] border border-line bg-surface-2 px-4 py-3">
                      <div className="min-w-0">
                        <Link href={c.href} className="block font-semibold text-ink hover:underline">
                          {c.title}
                        </Link>
                        <div className="text-[0.84rem] text-ink-3">{c.summary}</div>
                      </div>
                      <button type="button" onClick={() => projectsStore.removeCalc(p.id, c.id)} className="shrink-0 text-[0.78rem] font-semibold text-ink-3 hover:text-bad">
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
                {total > 0 ? <p className="mt-3 text-[0.9rem] text-ink-2">Estimated materials: <strong className="text-ink">{fmtMoney(total)}</strong></p> : null}
              </div>
              <ShoppingList title={`${p.name} — shopping list`} items={merged} calcKey="projects" />
            </div>
          </section>
        );
      })}
    </div>
  );
}
