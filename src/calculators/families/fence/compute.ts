// Pure fence math shared by the client calculators and the server-rendered answers.

import { ceilQty } from "@/lib/format";
import {
  BOB_OVERLAP_IN,
  CHAIN_LINK,
  CL_PRICES,
  FASTENERS,
  GATE_HARDWARE,
  GRAVEL_BAG,
  HOLE,
  INSTALLED,
  LABOR_PER_LF,
  PICKET_6FT_PRICE,
  POST_MIXES,
  POST_SPECS,
  POST_STOCK_FT,
  PPI_YOY,
  PRO_STAIN_PER_SQFT,
  PT_POST_PRICES,
  RAIL_2X4X8,
  RAIL_MAX_GAP_IN,
  REMOVAL_PER_LF,
  SINGLE_LEAF_SAG_IN,
  SPECIES_LABEL,
  STYLES,
  VINYL_CENTERS_8FT_IN,
  VINYL_PANEL_6X8,
  VINYL_POST_PRICE,
  WOOD_MAX_SPACING_FT,
  WOOD_PANEL_6X8,
  installed,
  type CostMaterialId,
  type FenceStyle,
  type InstalledCost,
  type MixId,
  type PostSize,
  type Priced,
  type WoodSpecies,
} from "./data";

export type Range = [number, number];

const round2 = (n: number) => Math.round(n * 100) / 100;
const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

/* ───────── layout: runs, corners, ends, gates ───────── */

export type PostKind = "end" | "corner" | "gate" | "line";

export interface GateSpec {
  widthFt: number;
  /** Double-leaf drive gate. */
  double: boolean;
  /** Index of the side (run) the gate sits in. */
  run: number;
}

export interface LayoutPost {
  /** Distance from the start of the run, ft. */
  d: number;
  kind: PostKind;
}

export interface LayoutGate {
  start: number;
  width: number;
  double: boolean;
}

export interface RunPlan {
  length: number;
  fenced: number;
  sections: number;
  /** Actual on-center post spacing in this run, ft. */
  spacing: number;
  posts: LayoutPost[];
  gates: LayoutGate[];
}

export interface Layout {
  runs: RunPlan[];
  loop: boolean;
  totalFt: number;
  fencedFt: number;
  sections: number;
  counts: Record<PostKind, number>;
  posts: number;
  walkGates: number;
  driveGates: number;
  /** Some side holds more gate width than its length. */
  overfull: boolean;
}

/**
 * Lays out each side (run) between its corner/end posts. Gates split a run into equal fenced segments.
 * `even`: stick-built and chain-link segments are divided evenly so no span exceeds the maximum
 * (Master Halco / Merchants method); panel fences keep full-width panels and cut the last one.
 * Each gate gets two posts of its own (Master Halco: "2 for each gate").
 */
export function planLayout(runLengths: number[], loop: boolean, gates: GateSpec[], maxSpacingFt: number, even = true): Layout {
  const lens: number[] = [];
  const compact: number[] = [];
  runLengths.forEach((l, i) => {
    if (Number.isFinite(l) && l > 0) {
      compact[i] = lens.length;
      lens.push(l);
    }
  });
  const n = lens.length;
  const isLoop = loop && n >= 3;
  const spacing = Math.max(1, maxSpacingFt);
  const placed = n > 0 ? gates.filter((g) => g.widthFt > 0) : [];
  let overfull = false;

  const runs: RunPlan[] = lens.map((L, k) => {
    const mine = placed.filter((g) => (compact[g.run] ?? 0) === k);
    const gateW = sum(mine.map((g) => g.widthFt));
    if (gateW > L + 1e-9) overfull = true;
    const fenced = Math.max(0, L - gateW);
    const segs = mine.length + 1;
    const segLen = fenced / segs;
    const perSeg = segLen > 0 ? ceilQty(segLen / spacing) : 0;
    const step = perSeg > 0 ? (even ? segLen / perSeg : spacing) : 0;

    const posts: LayoutPost[] = [{ d: 0, kind: k === 0 && !isLoop ? "end" : "corner" }];
    const gatesOut: LayoutGate[] = [];
    let d = 0;
    for (let j = 0; j < segs; j++) {
      for (let m = 1; m < perSeg; m++) posts.push({ d: d + m * step, kind: "line" });
      d += segLen;
      const g = mine[j];
      if (g) {
        posts.push({ d, kind: "gate" });
        gatesOut.push({ start: d, width: g.widthFt, double: g.double });
        d += g.widthFt;
        posts.push({ d, kind: "gate" });
      }
    }
    posts.push({ d: Math.max(d, L), kind: k === n - 1 && !isLoop ? "end" : "corner" });
    return { length: L, fenced, sections: perSeg * segs, spacing: even ? step : Math.min(step, segLen), posts, gates: gatesOut };
  });

  const counts: Record<PostKind, number> = {
    end: n > 0 && !isLoop ? 2 : 0,
    corner: isLoop ? n : Math.max(0, n - 1),
    gate: placed.length * 2,
    line: sum(runs.map((r) => r.posts.filter((p) => p.kind === "line").length)),
  };
  const totalFt = sum(lens);
  const fencedFt = sum(runs.map((r) => r.fenced));
  return {
    runs,
    loop: isLoop,
    totalFt,
    fencedFt,
    sections: sum(runs.map((r) => r.sections)),
    counts,
    posts: counts.end + counts.corner + counts.gate + counts.line,
    walkGates: placed.filter((g) => !g.double).length,
    driveGates: placed.filter((g) => g.double).length,
    overfull,
  };
}

/* ───────── post holes: depth, concrete, gravel ───────── */

/** Quikrete: bury 1/3 of the post's overall length, i.e. half its above-ground height (24 in floor). */
export function autoEmbedIn(heightFt: number): number {
  return Math.max(HOLE.minEmbedIn, (heightFt * 12) / 2);
}

/** Smallest stocked post length (8/10/12 ft) that covers the need; longer posts are special order. */
export function stockPostFt(minFt: number): { ft: number; special: boolean } {
  const ft = POST_STOCK_FT.find((x) => x >= minFt - 1e-9);
  return ft != null ? { ft, special: false } : { ft: Math.ceil(minFt / 2 - 1e-9) * 2, special: true };
}

/** Researched shelf price for a PT post, or a per-foot estimate from the longest researched length. */
export function ptPostPrice(size: "4x4" | "6x6", ft: number): Priced {
  const table = PT_POST_PRICES[size];
  const exact = table[ft];
  if (exact != null) return { price: exact };
  const longest = Math.max(...Object.keys(table).map(Number));
  return { price: round2(((table[longest] ?? 0) / longest) * ft), estimate: `Estimate from the ${longest}-ft price per foot` };
}

function squareAreaSqIn(sideIn: number): number {
  return sideIn * sideIn;
}

export function roundAreaSqIn(odIn: number): number {
  return Math.PI * (odIn / 2) ** 2;
}

/** Concrete (or gravel) around a post: hole area minus post area × fill height, in cu ft. */
export function annulusCuft(holeIn: number, postAreaSqIn: number, fillIn: number): number {
  const area = Math.max(0, (Math.PI * holeIn ** 2) / 4 - postAreaSqIn);
  return (area * Math.max(0, fillIn)) / 1728;
}

/** Gravel base under a post: full hole area × base depth, in cu ft. */
function gravelBaseCuft(holeIn: number, gravelIn: number): number {
  return ((Math.PI * holeIn ** 2) / 4) * Math.max(0, gravelIn) / 1728;
}

export function bagsFor(cuft: number, yieldCuft: number): number {
  return ceilQty(cuft / yieldCuft);
}

/**
 * Quikrete's own online post calculator (calculator.js): round post, hole 3× its diameter, concrete to
 * the top of the hole, no gravel, 50 lb Fast-Setting bags. An upper bound — shown for comparison.
 */
export function quikreteOfficialBags(postDiaIn: number, depthIn: number): number {
  const hole = postDiaIn * 3;
  return ceilQty(((((Math.PI * hole ** 2) / 4 - (Math.PI * postDiaIn ** 2) / 4) * depthIn) / 1728) / POST_MIXES.fs50.yieldCuft);
}

/* ───────── wood & vinyl fences ───────── */

export type SettingMethod = "concrete" | "mixed" | "gravel";

export interface FenceInput {
  style: FenceStyle;
  runs: number[];
  loop: boolean;
  heightFt: number;
  /** Post spacing for stick-built wood (capped at 8 ft). */
  spacingFt: number;
  /** Vinyl post centers in inches (panel width + post width). */
  vinylCentersIn: number;
  picketWidthIn: number;
  gapIn: number;
  overlapIn: number;
  species: WoodSpecies;
  /** 0 = automatic (≤ 24 in between rails). */
  railsOverride: number;
  gates: GateSpec[];
  gatePosts6x6: boolean;
  /** Hole diameter for every post, in; 0 = install-sheet sizes (10 in, 12 in for 6×6). */
  holeIn: number;
  /** 0 = automatic (1/3 of the post buried). */
  embedIn: number;
  /** Local frost depth in inches, 0 if unknown. */
  frostIn: number;
  setting: SettingMethod;
  mixId: MixId;
  wastePct: number;
}

/** The standard build of each style, used for comparisons and the cost calculator's DIY estimate. */
export function standardFenceInput(style: FenceStyle, runs: number[], heightFt: number, gates: GateSpec[]): FenceInput {
  const s = STYLES[style];
  return {
    style,
    runs,
    loop: false,
    heightFt,
    spacingFt: WOOD_MAX_SPACING_FT,
    vinylCentersIn: VINYL_CENTERS_8FT_IN,
    picketWidthIn: s.picketWidthIn,
    gapIn: s.gapIn,
    overlapIn: BOB_OVERLAP_IN,
    species: "pt",
    railsOverride: 0,
    gates,
    gatePosts6x6: true,
    holeIn: 0,
    embedIn: 0,
    frostIn: 0,
    setting: "concrete",
    mixId: "fs50",
    wastePct: 10,
  };
}

export interface PostGroup {
  kind: PostKind;
  count: number;
  size: PostSize;
  embedIn: number;
  holeIn: number;
  holeDepthIn: number;
  minLengthFt: number;
  /** Stocked length to buy (wood only). */
  stockFt?: number;
  special?: boolean;
  setIn: "concrete" | "gravel";
  bagsEach: number;
  concreteCuftEach: number;
  gravelCuftEach: number;
  price: Priced;
}

export interface MaterialLine {
  id: string;
  name: string;
  qty: number;
  unit: string;
  /** Unit price (USD); absent when we have no researched price. */
  price?: number;
  estimate?: string;
  note?: string;
}

const SINGULAR: Record<string, string> = {
  posts: "post", pickets: "picket", panels: "panel", boards: "board", bags: "bag", caps: "cap", hinges: "hinge", latches: "latch", rods: "rod",
  rolls: "roll", pieces: "piece", bars: "bar", bands: "band", cups: "cup", bolts: "bolt", ties: "tie", rings: "ring", gates: "gate",
};

/** Shopping-list units read "1 latch", not "1 latches". */
function withUnits(materials: MaterialLine[]): MaterialLine[] {
  return materials.map((m) => (m.qty === 1 && SINGULAR[m.unit] ? { ...m, unit: SINGULAR[m.unit] } : m));
}

/** "4 per line, corner & end post · 5 per gate post" */
export function bagsSummary(groups: { kind: PostKind; bagsEach: number }[]): string {
  const byBags = new Map<number, PostKind[]>();
  for (const g of groups) if (g.bagsEach > 0) byBags.set(g.bagsEach, [...(byBags.get(g.bagsEach) ?? []), g.kind]);
  return [...byBags]
    .map(([n, kinds]) => `${n} per ${kinds.length > 1 ? `${kinds.slice(0, -1).join(", ")} & ${kinds[kinds.length - 1]}` : kinds[0]} post`)
    .join(" · ");
}

export interface ConcreteTotals {
  bags: number;
  /** Bags if leftovers are carried from hole to hole (wet-mixed in a wheelbarrow). */
  pooledBags: number;
  cuft: number;
  cuyd: number;
  weightLb: number;
  waterGal: Range;
}

export interface FenceResult {
  style: FenceStyle;
  layout: Layout;
  heightFt: number;
  spacingFt: number;
  railsPerSection: number;
  pickets?: { net: number; gate: number; total: number; withWaste: number; pitchIn: number; perFt: number; lengthFt: number; frontGapIn?: number };
  panels: number;
  railBoards: number;
  gateFrameBoards: number;
  posts: PostGroup[];
  autoEmbedIn: number;
  embedIn: number;
  concrete: ConcreteTotals;
  /** Bags per line post if the hole is filled to the top with no gravel or soil cap. */
  fullHoleBagsLine: number;
  gravel: { cuft: number; bags: number };
  fasteners: { picket: number; rail: number; panelBrackets: number };
  hardware: { hinges: number; latches: number; dropRods: number; stiffeners: number };
  materials: MaterialLine[];
  materialCost: number;
  unpriced: string[];
  warnings: string[];
}

const PICKET_STOCK_FT = [4, 5, 6, 8];

/** Rails no more than 24 in apart (Home Depot): 2 up to 4 ft, 3 for 5–6 ft, 4 for 7–8 ft. */
export function railsPerSection(heightFt: number, override = 0): number {
  if (override >= 2) return Math.round(override);
  return Math.max(2, Math.ceil((heightFt * 12) / RAIL_MAX_GAP_IN - 1e-9));
}

/**
 * Only 5.5 in × 6 ft pickets have researched prices. Other sizes scale by length; narrower boards are
 * not discounted (retail 5 in and 5.5 in pickets cost about the same) but wider ones scale up.
 */
function picketPrice(species: WoodSpecies, widthIn: number, lengthFt: number): Priced {
  const base = PICKET_6FT_PRICE[species];
  if (widthIn === 5.5 && lengthFt === 6) return { price: base };
  return { price: round2(base * Math.max(1, widthIn / 5.5) * (lengthFt / 6)), estimate: "Estimate scaled from the 1×6×6 ft picket price" };
}

function panelPrice(base: number, widthFt: number, heightFt: number): Priced {
  if (widthFt === 8 && heightFt === 6) return { price: base };
  return { price: round2(base * (widthFt / 8) * (heightFt / 6)), estimate: "Estimate scaled from the 6×8 ft panel price" };
}

function concreteTotals(groups: { count: number; bagsEach: number; concreteCuftEach: number }[], mixId: MixId): ConcreteTotals {
  const mix = POST_MIXES[mixId];
  const bags = sum(groups.map((g) => g.count * g.bagsEach));
  const cuft = sum(groups.map((g) => g.count * g.concreteCuftEach));
  return {
    bags,
    pooledBags: bagsFor(cuft, mix.yieldCuft),
    cuft,
    cuyd: cuft / 27,
    weightLb: bags * mix.lb,
    waterGal: [bags * mix.waterGal[0], bags * mix.waterGal[1]],
  };
}

export function computeFence(input: FenceInput): FenceResult {
  const style = input.style;
  const isVinyl = style === "vinyl";
  const isPanel = style === "panel" || isVinyl;
  const stickBuilt = !isPanel;
  const H = Math.max(0, input.heightFt);
  const spacingFt = isVinyl
    ? Math.max(1, input.vinylCentersIn) / 12
    : style === "panel"
      ? WOOD_MAX_SPACING_FT
      : Math.min(WOOD_MAX_SPACING_FT, Math.max(1, input.spacingFt));
  const layout = planLayout(input.runs, input.loop, input.gates, spacingFt, stickBuilt);
  const rails = railsPerSection(H, input.railsOverride);
  const waste = Math.max(0, input.wastePct);
  const warnings: string[] = [];

  /* pickets or panels */
  let pickets: FenceResult["pickets"];
  let panels = 0;
  const panelWidthFt = isVinyl ? (input.vinylCentersIn < 84 ? 6 : 8) : 8;
  if (stickBuilt) {
    const w = Math.max(0, input.picketWidthIn);
    const pitch = style === "bob" ? w - Math.max(0, input.overlapIn) : w + Math.max(0, input.gapIn);
    const frontGapIn = style === "bob" ? w - 2 * Math.max(0, input.overlapIn) : undefined;
    if (pitch > 0 && w > 0) {
      const net = ceilQty((layout.fencedFt * 12) / pitch);
      const gate = sum(input.gates.filter((g) => g.widthFt > 0 && layout.runs.length > 0).map((g) => ceilQty((g.widthFt * 12) / pitch)));
      const total = net + gate;
      pickets = {
        net,
        gate,
        total,
        withWaste: ceilQty(total * (1 + waste / 100)),
        pitchIn: pitch,
        perFt: 12 / pitch,
        lengthFt: PICKET_STOCK_FT.find((x) => x >= H - 1e-9) ?? Math.ceil(H),
        frontGapIn,
      };
    }
    if (frontGapIn != null && frontGapIn < 0) warnings.push("The overlap is more than half the board width, so the front boards would touch. Use 1–1.5 in of overlap for 5.5-in boards.");
    else if (pitch <= 0 || w <= 0) warnings.push("Check the picket width and gap — they don't leave room for any boards.");
    if (style === "picket" && input.gapIn > 4) warnings.push("Gaps over 4 in fail the 4-in sphere test CPSC uses for pool barriers — a small child can slip through.");
  } else {
    panels = layout.sections;
  }

  /* rails & gate frames (stick-built only: one 8-ft board per rail per section) */
  const railBoards = stickBuilt ? layout.sections * rails : 0;
  let gateFrameBoards = 0;
  if (stickBuilt) {
    for (const g of input.gates) {
      if (g.widthFt <= 0 || layout.runs.length === 0) continue;
      const leaves = g.double ? 2 : 1;
      const leafFt = g.widthFt / leaves;
      const perBoard = Math.max(1, Math.floor(8 / leafFt));
      // each leaf: one rail per fence rail line plus a diagonal brace
      gateFrameBoards += leaves * (ceilQty(rails / perBoard) + 1);
    }
  }

  /* posts */
  const auto = autoEmbedIn(H);
  const embed = Math.max(input.embedIn > 0 ? input.embedIn : auto, input.frostIn);
  const gateEmbed = input.frostIn > 0 ? Math.max(embed, input.frostIn + HOLE.gateFrostExtraIn) : embed;
  const gravelIn = isVinyl ? HOLE.vinylGravelIn : HOLE.woodGravelIn;
  const mix = POST_MIXES[input.mixId] ?? POST_MIXES.fs50;
  const kinds: PostKind[] = ["line", "corner", "end", "gate"];
  const posts: PostGroup[] = kinds
    .map((kind) => {
      const count = layout.counts[kind];
      const size: PostSize = isVinyl ? "vinyl" : kind === "gate" && input.gatePosts6x6 ? "6x6" : "4x4";
      const spec = POST_SPECS[size];
      const holeIn = input.holeIn > 0 ? input.holeIn : spec.holeIn;
      const e = kind === "gate" ? gateEmbed : embed;
      const minLengthFt = H + e / 12;
      const setIn: PostGroup["setIn"] = input.setting === "gravel" || (input.setting === "mixed" && kind === "line") ? "gravel" : "concrete";
      const fill = annulusCuft(holeIn, squareAreaSqIn(spec.sideIn), e - HOLE.capIn);
      const stock = isVinyl ? undefined : stockPostFt(minLengthFt);
      const price: Priced = isVinyl ? { price: VINYL_POST_PRICE[kind] } : ptPostPrice(size as "4x4" | "6x6", stock!.ft);
      return {
        kind,
        count,
        size,
        embedIn: e,
        holeIn,
        holeDepthIn: e + gravelIn,
        minLengthFt,
        stockFt: stock?.ft,
        special: stock?.special,
        setIn,
        bagsEach: setIn === "concrete" ? bagsFor(fill, mix.yieldCuft) : 0,
        concreteCuftEach: setIn === "concrete" ? fill : 0,
        gravelCuftEach: gravelBaseCuft(holeIn, gravelIn) + (setIn === "gravel" ? fill : 0),
        price,
      };
    })
    .filter((g) => g.count > 0);

  const concrete = concreteTotals(posts, mix.id);
  const lineSpec = POST_SPECS[isVinyl ? "vinyl" : "4x4"];
  const fullHoleBagsLine = bagsFor(annulusCuft(input.holeIn > 0 ? input.holeIn : lineSpec.holeIn, squareAreaSqIn(lineSpec.sideIn), embed + gravelIn), mix.yieldCuft);
  const gravelCuft = sum(posts.map((g) => g.count * g.gravelCuftEach));
  const gravel = { cuft: gravelCuft, bags: bagsFor(gravelCuft, GRAVEL_BAG.cuft) };

  const fasteners = {
    picket: pickets ? pickets.total * FASTENERS.perPicketPerRail * rails : 0,
    rail: (railBoards + gateFrameBoards) * FASTENERS.perRailBoard,
    panelBrackets: style === "panel" ? panels * rails * 2 : 0,
  };
  const caps = layout.posts;
  const hardware = {
    hinges: layout.walkGates * GATE_HARDWARE.walk.hinges + layout.driveGates * GATE_HARDWARE.drive.hinges,
    latches: layout.walkGates * GATE_HARDWARE.walk.latches + layout.driveGates * GATE_HARDWARE.drive.latches,
    dropRods: layout.driveGates * GATE_HARDWARE.drive.dropRods,
    stiffeners: isVinyl ? layout.counts.gate : 0,
  };

  /* materials list (shared by the shopping list, cost lines and preset answers) */
  const materials: MaterialLine[] = [];
  const postBuckets = new Map<string, { g: PostGroup; count: number; kinds: PostKind[] }>();
  for (const g of posts) {
    const key = isVinyl ? `vinyl-${g.kind}` : `${g.size}-${g.stockFt}`;
    const b = postBuckets.get(key);
    if (b) {
      b.count += g.count;
      b.kinds.push(g.kind);
    } else postBuckets.set(key, { g, count: g.count, kinds: [g.kind] });
  }
  for (const [key, { g, count, kinds: ks }] of postBuckets) {
    const name = isVinyl
      ? `5×5 vinyl ${g.kind} posts`
      : `${POST_SPECS[g.size].label}×${g.stockFt} ft ground-contact PT posts${ks.length === 1 && ks[0] === "gate" ? " (gate)" : ""}`;
    materials.push({
      id: `post-${key}`,
      name,
      qty: count,
      unit: "posts",
      price: g.price.price,
      estimate: g.price.estimate,
      note: isVinyl ? undefined : ks.map((k) => `${posts.find((p) => p.kind === k)!.count} ${k}`).join(", "),
    });
  }
  if (pickets) {
    const pp = picketPrice(input.species, input.picketWidthIn, pickets.lengthFt);
    materials.push({
      id: `picket-${input.species}-${input.picketWidthIn}x${pickets.lengthFt}`,
      name: `${SPECIES_LABEL[input.species]} dog-ear pickets, ${input.picketWidthIn} in × ${pickets.lengthFt} ft`,
      qty: pickets.withWaste,
      unit: "pickets",
      price: pp.price,
      estimate: pp.estimate,
      note: `${pickets.net} fence + ${pickets.gate} gate + ${pickets.withWaste - pickets.total} spare`,
    });
  }
  if (panels > 0) {
    const pp = panelPrice(isVinyl ? VINYL_PANEL_6X8 : WOOD_PANEL_6X8, panelWidthFt, H);
    materials.push({
      id: `panel-${isVinyl ? "vinyl" : "wood"}-${H}x${panelWidthFt}`,
      name: isVinyl ? `White vinyl privacy panels, ${H} × ${panelWidthFt} ft` : `PT pine dog-ear privacy panels, ${H} × 8 ft`,
      qty: panels,
      unit: "panels",
      price: pp.price,
      estimate: pp.estimate,
      note: "Cut the last panel in each run to fit",
    });
  }
  if (railBoards + gateFrameBoards > 0) {
    materials.push({
      id: "rail-2x4x8-pt",
      name: "2×4×8 ft ground-contact PT rails",
      qty: railBoards + gateFrameBoards,
      unit: "boards",
      price: RAIL_2X4X8.price,
      estimate: RAIL_2X4X8.estimate,
      note: `${rails} per section${gateFrameBoards ? ` + ${gateFrameBoards} for gate frames` : ""}`,
    });
  }
  if (concrete.bags > 0) {
    materials.push({
      id: mix.priceId,
      name: `${mix.name}, ${mix.lb} lb bags`,
      qty: concrete.bags,
      unit: "bags",
      price: mix.price,
      note: bagsSummary(posts),
    });
  }
  if (gravel.bags > 0) {
    materials.push({
      id: "gravel-bag-0.5",
      name: "All-purpose gravel, 0.5 cu ft bags",
      qty: gravel.bags,
      unit: "bags",
      price: GRAVEL_BAG.price,
      note: `${gravelIn} in drainage base under each post${posts.some((g) => g.setIn === "gravel") ? " + tamped fill for gravel-set posts" : ""}`,
    });
  }
  if (fasteners.picket > 0) materials.push({ id: "screws-2in", name: "2 in hot-dip galvanized or stainless screws/nails (pickets)", qty: fasteners.picket, unit: "pcs", note: `${FASTENERS.perPicketPerRail} per picket per rail` });
  if (fasteners.rail > 0) materials.push({ id: "screws-3in", name: "3 in hot-dip galvanized or stainless screws/nails (rails)", qty: fasteners.rail, unit: "pcs" });
  if (fasteners.panelBrackets > 0) materials.push({ id: "brackets", name: "Fence panel brackets (or 3 in exterior screws)", qty: fasteners.panelBrackets, unit: "pcs", note: "one at each rail end" });
  if (caps > 0) materials.push({ id: "caps", name: isVinyl ? "5×5 vinyl post caps (if not included)" : "Post caps", qty: caps, unit: "caps", note: "often forgotten — keeps water out of end grain" });
  if (hardware.stiffeners > 0) materials.push({ id: "stiffeners", name: "Aluminum gate-post stiffener inserts", qty: hardware.stiffeners, unit: "pcs", note: "required for vinyl gate posts, sold separately" });
  if (isPanel && layout.walkGates + layout.driveGates > 0) {
    const n = layout.walkGates + layout.driveGates;
    materials.push({ id: "gate-kits", name: isVinyl ? "Matching vinyl gate kits" : "Matching prebuilt wood gates", qty: n, unit: n === 1 ? "gate" : "gates" });
  }
  if (hardware.hinges > 0) materials.push({ id: "hinges", name: "Heavy-duty gate hinges", qty: hardware.hinges, unit: "hinges", note: "2 per leaf" });
  if (hardware.latches > 0) materials.push({ id: "latches", name: "Gate latches", qty: hardware.latches, unit: "latches" });
  if (hardware.dropRods > 0) materials.push({ id: "drop-rods", name: "Drop rods / cane bolts (double gates)", qty: hardware.dropRods, unit: "rods" });

  const materialCost = sum(materials.map((m) => (m.price != null ? m.price * m.qty : 0)));
  const unpriced = materials.filter((m) => m.price == null).map((m) => m.name);

  /* warnings */
  if (layout.overfull) warnings.push("Your gates are wider than the side they're on. Check the gate widths or move a gate to a longer side.");
  if (input.embedIn > 0 && input.embedIn < auto && input.frostIn <= input.embedIn)
    warnings.push(`${input.embedIn} in is shallower than Quikrete's rule of burying a third of the post, which calls for ${auto} in on a ${H}-ft fence.`);
  if (posts.some((g) => g.special)) warnings.push("Posts longer than 12 ft are often special order — check availability before you dig.");
  if (input.gates.some((g) => !g.double && g.widthFt * 12 > SINGLE_LEAF_SAG_IN))
    warnings.push("Single gate leaves wider than 5 ft tend to sag. Build a double gate with a drop rod, or use 6×6 posts and an anti-sag cable kit.");
  if (mix.dryPour && posts.some((g) => g.setIn === "concrete" && g.embedIn - HOLE.capIn > HOLE.maxDryLiftIn))
    warnings.push("These holes take more than 30 in of concrete. Quikrete says to dry-pour Fast-Setting in lifts: fill to 30 in or less, soak with water, then add the rest.");
  if (posts.some((g) => g.holeIn <= POST_SPECS[g.size].sideIn)) warnings.push("The hole is no wider than the post, so there is no room for concrete around it.");
  if (pickets && waste < 5) warnings.push("Pickets split, warp and have bad knots — the usual allowance is about 10% extra.");
  if (H > 7) warnings.push("Under building codes based on the IRC, fences over 7 ft need a building permit, and local zoning or HOA rules often cap backyard fences lower. Check before you buy.");

  return {
    style,
    layout,
    heightFt: H,
    spacingFt,
    railsPerSection: rails,
    pickets,
    panels,
    railBoards,
    gateFrameBoards,
    posts,
    autoEmbedIn: auto,
    embedIn: embed,
    concrete,
    fullHoleBagsLine,
    gravel,
    fasteners,
    hardware,
    materials: withUnits(materials),
    materialCost,
    unpriced,
    warnings,
  };
}

/* ───────── chain link ───────── */

export interface ChainLinkInput {
  runs: number[];
  loop: boolean;
  heightFt: number;
  /** Line post spacing, capped at 10 ft. */
  spacingFt: number;
  gates: GateSpec[];
  tensionWire: boolean;
  frostIn: number;
  mixId: MixId;
}

export interface ChainLinkPosts {
  count: number;
  embedIn: number;
  holeIn: number;
  holeDepthIn: number;
  minLengthIn: number;
  bagsEach: number;
  concreteCuftEach: number;
  price: Priced;
}

export interface ChainLinkFittings {
  bandsPerBar: number;
  tensionBars: number;
  tensionBands: number;
  braceBands: number;
  railEndCups: number;
  carriageBolts: number;
  terminalCaps: number;
  loopCaps: number;
  lineTies: number;
  railTies: number;
  tensionWireFt: number;
  hogRings: number;
  /** Post and frame hinges are equal in number; each frame hinge takes a 3/8 × 2 in bolt, each post hinge a 3/8 × 3 in. */
  postHinges: number;
  frameHinges: number;
  latches: number;
  dropRods: number;
}

export interface ChainLinkResult {
  layout: Layout;
  heightFt: number;
  spacingFt: number;
  fabricFt: number;
  rolls: number;
  leftoverFt: number;
  topRailPieces: number;
  terminal: ChainLinkPosts;
  gatePosts: ChainLinkPosts;
  line: ChainLinkPosts;
  fittings: ChainLinkFittings;
  concrete: ConcreteTotals;
  gravel: { cuft: number; bags: number };
  materials: MaterialLine[];
  materialCost: number;
  unpriced: string[];
  warnings: string[];
}

/** Master Halco: 3 tension bands per bar for 3 ft, 42 in and 4 ft fabric; 4 for 5 ft; 5 for 6 ft. */
export function bandsPerTensionBar(heightFt: number): number {
  return Math.max(CHAIN_LINK.minBandsPerBar, Math.ceil(heightFt - 1 - 1e-9));
}

function clPostPrice(table: Record<number, number>, minLengthIn: number): Priced {
  const lengths = Object.keys(table).map(Number).sort((a, b) => a - b);
  const fit = lengths.find((l) => l >= minLengthIn - 1e-9);
  if (fit != null) return { price: table[fit] };
  const longest = lengths[lengths.length - 1];
  const wanted = Math.ceil(minLengthIn / 12 - 1e-9) * 12;
  return { price: round2((table[longest] / longest) * wanted), estimate: `Estimate from the ${longest / 12}-ft price per foot` };
}

export function computeChainLink(input: ChainLinkInput): ChainLinkResult {
  const H = Math.max(0, input.heightFt);
  const spacingFt = Math.min(CHAIN_LINK.maxLineSpacingFt, Math.max(1, input.spacingFt));
  const layout = planLayout(input.runs, input.loop, input.gates, spacingFt);
  const mix = POST_MIXES[input.mixId] ?? POST_MIXES.fs50;
  const fabricFt = layout.fencedFt;
  const rolls = ceilQty(fabricFt / CHAIN_LINK.rollFt);
  const topRailPieces = ceilQty(fabricFt / CHAIN_LINK.topRailPieceFt);

  const frost = Math.max(0, input.frostIn);
  const termEmbed = Math.max(CHAIN_LINK.terminalHoleDepthIn - CHAIN_LINK.gravelIn, frost);
  const gateEmbed = frost > 0 ? Math.max(termEmbed, frost + HOLE.gateFrostExtraIn) : termEmbed;
  const lineEmbed = Math.max(CHAIN_LINK.lineHoleDepthIn - CHAIN_LINK.gravelIn, frost);
  const heightIn = H * 12;

  const group = (count: number, odIn: number, holeIn: number, embedIn: number, aboveIn: number, table: Record<number, number>): ChainLinkPosts => {
    const cuft = annulusCuft(holeIn, roundAreaSqIn(odIn), embedIn - CHAIN_LINK.capIn);
    const minLengthIn = aboveIn + embedIn;
    return {
      count,
      embedIn,
      holeIn,
      holeDepthIn: embedIn + CHAIN_LINK.gravelIn,
      minLengthIn,
      bagsEach: bagsFor(cuft, mix.yieldCuft),
      concreteCuftEach: cuft,
      price: clPostPrice(table, minLengthIn),
    };
  };
  const termAbove = heightIn + CHAIN_LINK.terminalAboveIn;
  const terminal = group(layout.counts.end + layout.counts.corner, CHAIN_LINK.terminalOdIn, CHAIN_LINK.terminalHoleIn, termEmbed, termAbove, CL_PRICES.terminalPost);
  const gatePosts = group(layout.counts.gate, CHAIN_LINK.terminalOdIn, CHAIN_LINK.terminalHoleIn, gateEmbed, termAbove, CL_PRICES.terminalPost);
  const line = group(layout.counts.line, CHAIN_LINK.lineOdIn, CHAIN_LINK.lineHoleIn, lineEmbed, heightIn - CHAIN_LINK.lineBelowIn, CL_PRICES.linePost);
  const groups = [terminal, gatePosts, line];
  const concrete = concreteTotals(groups, mix.id);
  const gravelCuft =
    (terminal.count + gatePosts.count) * gravelBaseCuft(CHAIN_LINK.terminalHoleIn, CHAIN_LINK.gravelIn) + line.count * gravelBaseCuft(CHAIN_LINK.lineHoleIn, CHAIN_LINK.gravelIn);
  const gravel = { cuft: gravelCuft, bags: bagsFor(gravelCuft, GRAVEL_BAG.cuft) };

  const bandsPerBar = bandsPerTensionBar(H);
  const tensionBars = layout.counts.end + layout.counts.gate + 2 * layout.counts.corner;
  const tensionBands = tensionBars * bandsPerBar;
  const tensionWireFt = input.tensionWire ? fabricFt : 0;
  const fittings: ChainLinkFittings = {
    bandsPerBar,
    tensionBars,
    tensionBands,
    braceBands: tensionBars,
    railEndCups: tensionBars,
    carriageBolts: tensionBands + tensionBars,
    terminalCaps: terminal.count + gatePosts.count,
    loopCaps: line.count,
    lineTies: ceilQty((line.count * heightIn) / CHAIN_LINK.lineTieEveryIn),
    railTies: ceilQty(fabricFt / CHAIN_LINK.railTieEveryFt),
    tensionWireFt,
    hogRings: ceilQty(tensionWireFt / CHAIN_LINK.hogRingEveryFt),
    postHinges: layout.walkGates * GATE_HARDWARE.walk.hinges + layout.driveGates * GATE_HARDWARE.drive.hinges,
    frameHinges: layout.walkGates * GATE_HARDWARE.walk.hinges + layout.driveGates * GATE_HARDWARE.drive.hinges,
    latches: layout.walkGates + layout.driveGates,
    dropRods: layout.driveGates,
  };

  const ftIn = (inches: number) => `${Math.floor(inches / 12)}' ${Math.round(inches % 12)}"`;
  const materials: MaterialLine[] = [
    {
      id: `cl-fabric-${H}`,
      name: `Galvanized chain-link fabric, ${H} ft × 50 ft rolls`,
      qty: rolls,
      unit: "rolls",
      price: CL_PRICES.fabricRoll.price,
      estimate: CL_PRICES.fabricRoll.estimate,
      note: rolls ? `${Math.round(rolls * CHAIN_LINK.rollFt - fabricFt)} ft left over` : undefined,
    },
    { id: "cl-top-rail", name: "Top rail, 1-3/8 in × 10 ft 6 in swedged", qty: topRailPieces, unit: "pieces", price: CL_PRICES.topRail },
  ];
  if (terminal.count + gatePosts.count > 0) {
    const longest = Math.max(terminal.minLengthIn, gatePosts.count ? gatePosts.minLengthIn : 0);
    const price = clPostPrice(CL_PRICES.terminalPost, longest);
    materials.push({
      id: `cl-terminal-${H}`,
      name: "Terminal posts, 2-3/8 in OD (end, corner & gate)",
      qty: terminal.count + gatePosts.count,
      unit: "posts",
      price: price.price,
      estimate: price.estimate,
      note: `at least ${ftIn(terminal.minLengthIn)} long${gatePosts.count && gatePosts.minLengthIn > terminal.minLengthIn ? `; gate posts ${ftIn(gatePosts.minLengthIn)}` : ""}`,
    });
  }
  if (line.count > 0)
    materials.push({ id: `cl-line-${H}`, name: "Line posts, 1-5/8 in OD", qty: line.count, unit: "posts", price: line.price.price, estimate: line.price.estimate, note: `at least ${ftIn(line.minLengthIn)} long` });
  if (concrete.bags > 0) materials.push({ id: mix.priceId, name: `${mix.name}, ${mix.lb} lb bags`, qty: concrete.bags, unit: "bags", price: mix.price });
  if (gravel.bags > 0) materials.push({ id: "gravel-bag-0.5", name: "All-purpose gravel, 0.5 cu ft bags", qty: gravel.bags, unit: "bags", price: GRAVEL_BAG.price, note: `${CHAIN_LINK.gravelIn} in base under each post` });
  const f = fittings;
  const fit = (id: string, name: string, qty: number, unit: string, note?: string) => qty > 0 && materials.push({ id, name, qty, unit, note });
  fit("cl-tension-bars", "Tension bars", f.tensionBars, "bars", "1 per end & gate post, 2 per corner");
  fit("cl-tension-bands", "Tension bands", f.tensionBands, "bands", `${bandsPerBar} per tension bar`);
  fit("cl-brace-bands", "Brace (rail-end) bands", f.braceBands, "bands");
  fit("cl-rail-ends", "Rail end cups", f.railEndCups, "cups");
  fit("cl-bolts", "Carriage bolts & nuts, 5/16 × 1-1/4 in", f.carriageBolts, "bolts", "1 per tension band and brace band");
  fit("cl-dome-caps", "Terminal post caps (dome)", f.terminalCaps, "caps");
  fit("cl-loop-caps", "Line post loop caps", f.loopCaps, "caps");
  fit("cl-ties", "Aluminum fence ties", f.lineTies + f.railTies, "ties", `${f.lineTies} on line posts + ${f.railTies} on top rail`);
  fit("cl-wire", "Bottom tension wire (7 ga)", f.tensionWireFt, "ft");
  fit("cl-hog-rings", "Hog rings for tension wire", f.hogRings, "rings", "about every 24 in");
  fit("cl-post-hinges", "Gate post hinges", f.postHinges, "hinges");
  fit("cl-frame-hinges", "Gate frame hinges", f.frameHinges, "hinges");
  fit("cl-latches", "Fork latches (walk) / drive-gate latches", f.latches, "latches");
  fit("cl-drop-rods", "Drop rods (double gates)", f.dropRods, "rods");
  fit("cl-hinge-bolts", "Hinge carriage bolts, 3/8 × 2 in and 3/8 × 3 in", f.frameHinges + f.postHinges, "bolts", `${f.frameHinges} short (frame) + ${f.postHinges} long (post)`);
  fit("cl-gates", "Chain-link gates (walk / drive)", layout.walkGates + layout.driveGates, "gates");

  const materialCost = sum(materials.map((m) => (m.price != null ? m.price * m.qty : 0)));
  const unpriced = materials.filter((m) => m.price == null).map((m) => m.name);
  const warnings: string[] = [];
  if (layout.overfull) warnings.push("Your gates are wider than the side they're on. Check the gate widths or move a gate to a longer side.");
  if (input.spacingFt > CHAIN_LINK.maxLineSpacingFt) warnings.push("Line posts can't be more than 10 ft apart (Lowe's, Merchants Metals), so spacing was capped at 10 ft.");
  if (mix.dryPour && groups.some((g) => g.count > 0 && g.embedIn - CHAIN_LINK.capIn > HOLE.maxDryLiftIn))
    warnings.push("These holes take more than 30 in of concrete. Quikrete says to dry-pour Fast-Setting in lifts: fill to 30 in or less, soak with water, then add the rest.");

  return {
    layout,
    heightFt: H,
    spacingFt,
    fabricFt,
    rolls,
    leftoverFt: rolls * CHAIN_LINK.rollFt - fabricFt,
    topRailPieces,
    terminal,
    gatePosts,
    line,
    fittings,
    concrete,
    gravel,
    materials: withUnits(materials),
    materialCost,
    unpriced,
    warnings,
  };
}

export function standardChainLinkInput(runs: number[], heightFt: number, gates: GateSpec[]): ChainLinkInput {
  return { runs, loop: false, heightFt, spacingFt: CHAIN_LINK.maxLineSpacingFt, gates, tensionWire: true, frostIn: 0, mixId: "fs50" };
}

/* ───────── installed cost ───────── */

export interface FenceCostInput {
  lengthFt: number;
  material: CostMaterialId;
  heightFt: number;
  walkGates: number;
  driveGates: number;
  removeOld: boolean;
  stain: boolean;
  stainSides: 1 | 2;
  /** A contractor's total quote to check, 0 if none. */
  quote: number;
}

export interface DiyEstimate {
  materials: number;
  /** Items in the takeoff that have no researched price (not in the total). */
  unpriced: string[];
  /** Some prices in the total are estimates. */
  hasEstimates: boolean;
}

export interface FenceCostResult {
  material: InstalledCost;
  fence: Range;
  gates: Range;
  gatesUnpriced: number;
  removal: Range;
  stain: Range | null;
  total: Range;
  mid: number;
  perLfAllIn: Range;
  labor: Range;
  diy?: DiyEstimate;
  compare: { id: CostMaterialId; name: string; perLf: Range; total: Range }[];
  quote?: { perLf: number; position: "below" | "within" | "above" };
  ppi: { pct: number; series: string };
}

const scale = (r: Range, k: number): Range => [r[0] * k, r[1] * k];
const add = (...rs: Range[]): Range => [sum(rs.map((r) => r[0])), sum(rs.map((r) => r[1]))];

function gateSpecs(walk: number, drive: number): GateSpec[] {
  return [
    ...Array.from({ length: Math.max(0, Math.round(walk)) }, () => ({ widthFt: 4, double: false, run: 0 })),
    ...Array.from({ length: Math.max(0, Math.round(drive)) }, () => ({ widthFt: 10, double: true, run: 0 })),
  ];
}

/** DIY materials from our own takeoff for the materials we model (straight run, standard build). */
export function diyMaterials(material: CostMaterialId, lengthFt: number, heightFt: number, walkGates: number, driveGates: number): DiyEstimate | undefined {
  if (lengthFt <= 0) return undefined;
  const gates = gateSpecs(walkGates, driveGates);
  const style: FenceStyle | null = material === "wood-privacy" ? "privacy" : material === "wood-picket" ? "picket" : material === "vinyl" ? "vinyl" : null;
  const r =
    style != null
      ? computeFence(standardFenceInput(style, [lengthFt], heightFt, gates))
      : material === "chain-link"
        ? computeChainLink(standardChainLinkInput([lengthFt], heightFt, gates))
        : null;
  if (!r) return undefined;
  return { materials: r.materialCost, unpriced: r.unpriced, hasEstimates: r.materials.some((m) => m.estimate != null) };
}

export function computeFenceCost(input: FenceCostInput): FenceCostResult {
  const m = installed(input.material);
  const L = Math.max(0, input.lengthFt);
  const walk = Math.max(0, Math.round(input.walkGates));
  const drive = Math.max(0, Math.round(input.driveGates));

  const fence = scale(m.perLf, L);
  let gates: Range = [0, 0];
  let gatesUnpriced = 0;
  if (walk) {
    if (m.walkGate) gates = add(gates, scale(m.walkGate, walk));
    else gatesUnpriced += walk;
  }
  if (drive) {
    if (m.driveGate) gates = add(gates, scale(m.driveGate, drive));
    else gatesUnpriced += drive;
  }
  const removal: Range = input.removeOld ? scale(REMOVAL_PER_LF, L) : [0, 0];
  const stain = input.stain && m.stainable ? scale(PRO_STAIN_PER_SQFT, L * input.heightFt * input.stainSides) : null;
  const total = add(fence, gates, removal, stain ?? [0, 0]);
  const compare = [...INSTALLED]
    .sort((a, b) => a.perLf[0] + a.perLf[1] - (b.perLf[0] + b.perLf[1]))
    .map((x) => ({ id: x.id, name: x.name, perLf: x.perLf, total: scale(x.perLf, L) }));
  let quote: FenceCostResult["quote"];
  if (input.quote > 0 && L > 0) {
    const perLf = input.quote / L;
    const all = [total[0] / L, total[1] / L];
    quote = { perLf, position: perLf < all[0] ? "below" : perLf > all[1] ? "above" : "within" };
  }
  return {
    material: m,
    fence,
    gates,
    gatesUnpriced,
    removal,
    stain,
    total,
    mid: (total[0] + total[1]) / 2,
    perLfAllIn: L > 0 ? [total[0] / L, total[1] / L] : [0, 0],
    labor: scale(LABOR_PER_LF, L),
    diy: diyMaterials(m.id, L, input.heightFt, walk, drive),
    compare,
    quote,
    ppi: PPI_YOY[m.ppi],
  };
}
