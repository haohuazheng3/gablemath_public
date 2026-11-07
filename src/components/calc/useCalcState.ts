"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { trackOnce } from "@/lib/analytics";

export type CalcValue = string | number | boolean;
export type CalcValues = Record<string, CalcValue>;

function coerce(raw: string, like: CalcValue): CalcValue | undefined {
  if (typeof like === "number") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }
  if (typeof like === "boolean") return raw === "1" || raw === "true";
  return raw.slice(0, 120);
}

function encode(v: CalcValue): string {
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number") return String(Math.round(v * 1e6) / 1e6);
  return v;
}

/**
 * Calculator state with instant local updates, shareable URLs and no hydration drift:
 * - first render = preset/defaults (identical on server and client)
 * - after mount, ?query values (from a shared link) are applied
 * - edits are mirrored into the query string (replaceState, debounced) so the URL is always shareable
 * Canonical tags always point at the clean path, so query variants never compete in search.
 */
export function useCalcState<V extends CalcValues>(calcKey: string, defaults: V, initial?: Partial<V>) {
  const start = useMemo(() => ({ ...defaults, ...(initial ?? {}) }) as V, [defaults, initial]);
  const [values, setValues] = useState<V>(start);
  const dirty = useRef(false);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.size === 0) return;
    const next = { ...start } as Record<string, CalcValue>;
    let changed = false;
    for (const k of Object.keys(defaults)) {
      const raw = sp.get(k);
      if (raw == null) continue;
      const v = coerce(raw, defaults[k]);
      if (v !== undefined) {
        next[k] = v;
        changed = true;
      }
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from a shared link after hydration
    if (changed) setValues(next as V);
  }, [defaults, start]);

  useEffect(() => {
    if (!dirty.current) return;
    const t = window.setTimeout(() => {
      const sp = new URLSearchParams();
      for (const k of Object.keys(values)) {
        if (values[k] !== start[k]) sp.set(k, encode(values[k]));
      }
      const qs = sp.toString();
      const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.replaceState(window.history.state, "", url);
    }, 300);
    return () => window.clearTimeout(t);
  }, [values, start]);

  const set = useCallback(
    (patch: Partial<V>) => {
      dirty.current = true;
      setValues((v) => ({ ...v, ...patch }));
      trackOnce(`calc:${calcKey}`, "calc_used", { calc: calcKey });
    },
    [calcKey],
  );

  const reset = useCallback(() => {
    dirty.current = false;
    setValues(start);
    window.history.replaceState(window.history.state, "", window.location.pathname);
  }, [start]);

  const shareUrl = useCallback(() => {
    const sp = new URLSearchParams();
    for (const k of Object.keys(values)) sp.set(k, encode(values[k]));
    return `${window.location.origin}${window.location.pathname}?${sp.toString()}`;
  }, [values]);

  return { values, set, reset, shareUrl };
}
