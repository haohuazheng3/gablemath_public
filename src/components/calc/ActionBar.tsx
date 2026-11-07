"use client";

import { clsx } from "clsx";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { track } from "@/lib/analytics";
import { projectsStore, useProjects, type ShoppingItem } from "./projects";

export interface SaveablePayload {
  calcKey: string;
  calcName: string;
  title: string;
  summary: string;
  items: ShoppingItem[];
}

function Btn({
  children,
  onClick,
  active,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "inline-flex h-10 items-center gap-2 rounded-full px-4 text-[0.84rem] font-semibold transition-[background,color,transform] duration-150 active:scale-95",
        active ? "bg-ok-soft text-ok" : "bg-surface-2 text-ink-2 ring-1 ring-line hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function ActionBar({
  payload,
  shareUrl,
  onReset,
}: {
  payload: () => SaveablePayload;
  shareUrl: () => string;
  onReset: () => void;
}) {
  const [shared, setShared] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [savedTo, setSavedTo] = useState<string | null>(null);

  async function share() {
    const url = shareUrl();
    const p = payload();
    setShared(true);
    window.setTimeout(() => setShared(false), 1800);
    track("calc_shared", { calc: p.calcKey });
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: p.title, text: p.summary, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch (err) {
      // user cancelled the share sheet or clipboard blocked — nothing else to do
      console.info("[share] not completed", err);
    }
  }

  return (
    <div className="no-print mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-5">
      <div className="relative">
        <Btn onClick={() => setSaveOpen((o) => !o)} active={!!savedTo}>
          <Icon d="M5 3h10l4 4v14H5zM8 3v5h7" />
          {savedTo ? `Saved to ${savedTo}` : "Save to project"}
        </Btn>
        {saveOpen ? (
          <SavePopover
            onClose={() => setSaveOpen(false)}
            onSaved={(name) => {
              setSavedTo(name);
              window.setTimeout(() => setSavedTo(null), 3500);
            }}
            payload={payload}
            shareUrl={shareUrl}
          />
        ) : null}
      </div>
      <Btn onClick={share} active={shared}>
        <Icon d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
        {shared ? "Link copied" : "Share"}
      </Btn>
      <Btn
        onClick={() => {
          track("calc_printed", { calc: payload().calcKey });
          window.print();
        }}
      >
        <Icon d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
        Print
      </Btn>
      <button
        type="button"
        onClick={onReset}
        className="ml-auto h-10 rounded-full px-3 text-[0.82rem] font-medium text-ink-3 transition hover:text-ink active:scale-95"
      >
        Reset
      </button>
    </div>
  );
}

function SavePopover({
  onClose,
  onSaved,
  payload,
  shareUrl,
}: {
  onClose: () => void;
  onSaved: (name: string) => void;
  payload: () => SaveablePayload;
  shareUrl: () => string;
}) {
  const projects = useProjects();
  const [name, setName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  function saveTo(projectId: string, projectName: string) {
    const p = payload();
    const url = new URL(shareUrl());
    projectsStore.addCalc(projectId, {
      calcKey: p.calcKey,
      calcName: p.calcName,
      title: p.title,
      summary: p.summary,
      items: p.items,
      href: `${url.pathname}${url.search}`,
    });
    track("calc_saved", { calc: p.calcKey });
    onSaved(projectName);
    onClose();
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Save to project"
      className="animate-rise absolute bottom-12 left-0 z-30 w-[min(20rem,calc(100vw-3rem))] rounded-[20px] border border-line bg-surface p-3 shadow-pop"
    >
      <div className="px-1 pb-2 text-[0.8rem] font-semibold text-ink">Save this calculation to…</div>
      {projects.length ? (
        <ul className="mb-2 max-h-48 space-y-1 overflow-auto">
          {projects.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => saveTo(p.id, p.name)}
                className="flex w-full items-center justify-between rounded-[12px] px-3 py-2 text-left text-[0.86rem] text-ink transition hover:bg-surface-2 active:scale-[0.98]"
              >
                <span className="truncate">{p.name}</span>
                <span className="text-[0.74rem] text-ink-3">{p.calcs.length} saved</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const p = projectsStore.create(name || "My project");
          saveTo(p.id, p.name);
        }}
        className="flex gap-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={projects.length ? "New project name" : "Project name, e.g. Backyard patio"}
          className="well h-10 min-w-0 flex-1 px-3 text-[0.9rem] text-ink outline-none"
          maxLength={60}
          aria-label="New project name"
        />
        <button type="submit" className="h-10 rounded-full bg-ink px-4 text-[0.82rem] font-semibold text-bg active:scale-95">
          Save
        </button>
      </form>
      <p className="px-1 pt-2 text-[0.72rem] leading-snug text-ink-3">Saved in this browser only — no account needed.</p>
    </div>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
