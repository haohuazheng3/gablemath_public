export type RefreshResult = { changed: boolean; detail: string };
export type Refresher = { name: string; run: () => Promise<RefreshResult> };

export const refreshers: Refresher[] = [];

/** Called by each dataset refresher module (imported from scripts/refreshers.ts). */
export function register(r: Refresher) {
  refreshers.push(r);
}
