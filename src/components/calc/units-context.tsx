"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { UnitSystem } from "@/lib/units";

interface UnitCtx {
  system: UnitSystem;
  setSystem: (s: UnitSystem) => void;
}

const Ctx = createContext<UnitCtx>({ system: "imperial", setSystem: () => {} });

export function UnitProvider({ children }: { children: ReactNode }) {
  const [system, setSystemState] = useState<UnitSystem>("imperial");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("gm-units");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore saved preference after hydration
      if (saved === "metric" || saved === "imperial") setSystemState(saved);
    } catch {
      /* storage unavailable (private mode) — imperial default is fine */
    }
  }, []);

  const setSystem = useCallback((s: UnitSystem) => {
    setSystemState(s);
    try {
      localStorage.setItem("gm-units", s);
    } catch {
      /* storage unavailable — preference lasts for this page only */
    }
  }, []);

  return <Ctx.Provider value={{ system, setSystem }}>{children}</Ctx.Provider>;
}

export function useUnits() {
  return useContext(Ctx);
}
