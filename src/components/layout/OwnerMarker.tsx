"use client";

import { useEffect } from "react";
import { identify } from "@/lib/analytics";
import { SITE } from "@/lib/site";

/**
 * The owner's browsers are marked on their first /admin visit (gm-owner + fw_exclude cookie).
 * From then on every visit identifies as the owner so FlowGlance can exclude self-testing.
 */
export function OwnerMarker() {
  useEffect(() => {
    try {
      if (localStorage.getItem("gm-owner") === "1") identify({ userRef: "owner", email: SITE.ownerEmail });
    } catch {
      /* storage blocked — nothing to mark */
    }
  }, []);
  return null;
}

export function MarkOwnerOnMount() {
  useEffect(() => {
    try {
      localStorage.setItem("gm-owner", "1");
      document.cookie = `fw_exclude=1; Max-Age=${60 * 60 * 24 * 400}; Path=/; SameSite=Lax; Secure`;
    } catch (err) {
      console.warn("[owner] could not mark this browser", err);
    }
    identify({ userRef: "owner", email: SITE.ownerEmail });
  }, []);
  return null;
}
