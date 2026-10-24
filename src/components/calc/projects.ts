"use client";

import { useSyncExternalStore } from "react";

// "My projects": saved calculations grouped into projects, kept only in this browser
// (no accounts). A project's shopping list is the sum of its saved calculations.

export interface ShoppingItem {
  /** Stable id within a calculation, e.g. "bag-80". Items with the same name+unit merge across a project. */
  id: string;
  name: string;
  qty: number;
  unit: string;
  note?: string;
  /** Estimated cost for this line (USD), optional. */
  cost?: number;
}

export interface SavedCalc {
  id: string;
  calcKey: string;
  calcName: string;
  title: string;
  /** Path + query that reopens this exact calculation. */
  href: string;
  summary: string;
  items: ShoppingItem[];
  savedAt: number;
}

export interface Project {
  id: string;
  name: string;
  calcs: SavedCalc[];
  createdAt: number;
  updatedAt: number;
}

const KEY = "gm-projects-v1";
const listeners = new Set<() => void>();
let cache: Project[] | null = null;
const EMPTY: Project[] = [];

function read(): Project[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Project[]) : [];
  } catch (err) {
    console.warn("[projects] could not read saved projects", err);
    cache = [];
  }
  return cache;
}

function write(next: Project[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch (err) {
    console.warn("[projects] could not persist projects", err);
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useProjects(): Project[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export const projectsStore = {
  create(name: string): Project {
    const p: Project = { id: uid(), name: name.trim() || "My project", calcs: [], createdAt: Date.now(), updatedAt: Date.now() };
    write([p, ...read()]);
    return p;
  },
  addCalc(projectId: string, calc: Omit<SavedCalc, "id" | "savedAt">): SavedCalc {
    const saved: SavedCalc = { ...calc, id: uid(), savedAt: Date.now() };
    write(
      read().map((p) => (p.id === projectId ? { ...p, calcs: [saved, ...p.calcs], updatedAt: Date.now() } : p)),
    );
    return saved;
  },
  removeCalc(projectId: string, calcId: string) {
    write(read().map((p) => (p.id === projectId ? { ...p, calcs: p.calcs.filter((c) => c.id !== calcId), updatedAt: Date.now() } : p)));
  },
  rename(projectId: string, name: string) {
    write(read().map((p) => (p.id === projectId ? { ...p, name: name.trim() || p.name, updatedAt: Date.now() } : p)));
  },
  remove(projectId: string) {
    write(read().filter((p) => p.id !== projectId));
  },
};

/** Merge identical items (same name + unit) across a project's calculations. */
export function mergeItems(calcs: SavedCalc[]): ShoppingItem[] {
  const map = new Map<string, ShoppingItem>();
  for (const c of calcs) {
    for (const it of c.items) {
      const k = `${it.name}__${it.unit}`;
      const prev = map.get(k);
      if (prev) {
        map.set(k, { ...prev, qty: prev.qty + it.qty, cost: (prev.cost ?? 0) + (it.cost ?? 0) || undefined });
      } else {
        map.set(k, { ...it, id: k });
      }
    }
  }
  return [...map.values()];
}

export function itemsToText(title: string, items: ShoppingItem[]): string {
  const lines = items.map((i) => `☐ ${fmtQty(i.qty)} ${i.unit} — ${i.name}${i.note ? ` (${i.note})` : ""}`);
  return `${title}\n${lines.join("\n")}\n\nMade with GableMath — https://gablemath.com`;
}

function fmtQty(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
