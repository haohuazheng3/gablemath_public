// Pure tile math shared by the tile, thinset, grout and backer-board calculators (server + client).
// Formulas follow research/tile.verified.json → formulas (module method for tiles and grout joints,
// chart method for thinset, sheet-area method for backer board).

import { ceilQty } from "@/lib/format";
import {
  BACK_BUTTER_IN,
  BACKER_RULES,
  GOBOARD_FASTENER_PACK,
  GROUT_EXTRA_PCT,
  INSTALLED,
  LFT_SIDE_IN,
  MESH_TAPE_PACKS,
  MORTAR_WASTE_PCT,
  MOSAIC_PREMIUM,
  OFFSET_LIMIT_SIDE_IN,
  PATTERN_PREMIUM,
  PATTERNS,
  SCREW_PACKS,
  WASTE_RULES,
  WATERPROOF_EXTRA_PCT,
  WATERPROOFING,
  WEDI_FASTENER_PACKS,
  backer,
  grout,
  mortar,
  tileFormat,
  trowel,
  type Backer,
  type Grout,
  type GroutPack,
  type Mortar,
  type PatternId,
  type ProjectId,
  type TileFormat,
  type TrowelId,
  type WaterproofId,
} from "./data";

const pos = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);

/* ───────── area ───────── */

export interface Rect {
  /** feet */
  l: number;
  /** feet (width, or height for a wall) */
  w: number;
}

/** Sum of surfaces minus openings (windows, doors, tub, vanity). Never negative. */
export function netArea(surfaces: Rect[], openings: Rect[] = []) {
  const gross = surfaces.reduce((s, r) => s + pos(r.l) * pos(r.w), 0);
  const deduct = Math.min(gross, openings.reduce((s, r) => s + pos(r.l) * pos(r.w), 0));
  return { gross, deduct, net: gross - deduct };
}

/* ───────── tile geometry ───────── */

export interface TileDims {
  format: TileFormat;
  longIn: number;
  shortIn: number;
  thickIn: number;
  pcsPerBox: number;
  sheet: boolean;
  /** Size of the individual piece the grout joint runs around (the chip, for mosaic sheets). */
  groutLongIn: number;
  groutShortIn: number;
}

export interface CustomTile {
  l: number;
  w: number;
  pcs: number;
  t: number;
}

export function tileDims(sizeId: string, custom?: CustomTile, chipIn = 2): TileDims {
  const f = tileFormat(sizeId);
  if (f.id === "custom" && custom) {
    const a = pos(custom.l) || f.longIn;
    const b = pos(custom.w) || f.shortIn;
    const longIn = Math.max(a, b);
    const shortIn = Math.min(a, b);
    return { format: f, longIn, shortIn, thickIn: pos(custom.t) || f.thickIn, pcsPerBox: Math.max(1, Math.round(pos(custom.pcs) || 1)), sheet: false, groutLongIn: longIn, groutShortIn: shortIn };
  }
  const chip = f.sheet ? pos(chipIn) || 2 : 0;
  return {
    format: f,
    longIn: f.longIn,
    shortIn: f.shortIn,
    thickIn: f.thickIn,
    pcsPerBox: f.pcsPerBox,
    sheet: !!f.sheet,
    groutLongIn: f.sheet ? chip : f.longIn,
    groutShortIn: f.sheet ? chip : f.shortIn,
  };
}

/** Floor area one piece (or one mosaic sheet) covers including its share of the joint, sq ft. */
export function pieceModuleSqFt(d: TileDims, jointIn: number): number {
  if (d.sheet) return (d.longIn * d.shortIn) / 144; // sheet already includes the joints between chips
  const j = pos(jointIn);
  return ((d.longIn + j) * (d.shortIn + j)) / 144;
}

/** Face area of one piece, sq ft (what cartons are labelled with). */
export function pieceFaceSqFt(d: TileDims): number {
  return (d.longIn * d.shortIn) / 144;
}

/** Nominal 24-in tiles measure 23⅜–23⅝ in, so anything 23 in or longer counts as a 24-in format. */
export function isLargeFormat(longIn: number): boolean {
  return longIn >= WASTE_RULES.largeFormatIn - 1;
}

/** Recommended cut waste, %: pattern base, at least 15% for 24-in formats, +5% in rooms under 40 sq ft. */
export function patternWaste(pattern: PatternId, longIn: number, areaSqFt: number): number {
  let w = PATTERNS.find((p) => p.id === pattern)?.waste ?? 10;
  if (isLargeFormat(longIn)) w = Math.max(w, WASTE_RULES.largeFormatPct);
  if (areaSqFt > 0 && areaSqFt < WASTE_RULES.smallRoomSqFt) w += WASTE_RULES.smallRoomAddPct;
  return w;
}

export function tileCount(i: { areaSqFt: number; dims: TileDims; jointIn: number; wastePct: number; atticPct?: number }) {
  const area = pos(i.areaSqFt);
  const perPiece = pieceModuleSqFt(i.dims, i.jointIn);
  const piecesNet = perPiece > 0 ? area / perPiece : 0;
  const pieces = ceilQty((area * (1 + pos(i.wastePct) / 100)) / perPiece);
  const attic = ceilQty((pieces * pos(i.atticPct ?? 0)) / 100);
  const boxes = ceilQty((pieces + attic) / i.dims.pcsPerBox);
  const boxSqFt = i.dims.pcsPerBox * pieceFaceSqFt(i.dims);
  return { perPiece, piecesNet, pieces, attic, boxes, boxSqFt, sqftBought: boxes * boxSqFt, spare: boxes * i.dims.pcsPerBox - pieces - attic };
}

/** Price of one box (or one mosaic sheet). */
export function boxPrice(d: TileDims, pricePerUnit: number): number {
  const p = pos(pricePerUnit);
  if (d.format.priceUnit === "piece" && d.format.id !== "custom") return p * d.pcsPerBox;
  return p * d.pcsPerBox * pieceFaceSqFt(d);
}

/* ───────── thinset ───────── */

/** Trowel by tile size (research defaults): mosaics 3/16 V, ≤ 8 in ¼ × ¼, ≤ 15 in ¼ × ⅜, larger ¾ U-notch at 30°. */
export function autoTrowel(d: Pick<TileDims, "longIn" | "sheet">): TrowelId {
  if (d.sheet) return "v";
  if (d.longIn <= 8) return "sq14";
  if (d.longIn <= LFT_SIDE_IN) return "sq38";
  return "u30";
}

/** Store-brand modified thinset up to 15 in; above that an LHT-rated mortar (VersaBond, A118.4H). */
export function autoMortar(d: Pick<TileDims, "longIn">): string {
  return d.longIn > LFT_SIDE_IN ? "versabond" : "basic";
}

export function needsBackButter(longIn: number): boolean {
  return longIn > LFT_SIDE_IN;
}

export type CoverageBasis = "chart" | "ratio" | "fallback";

/** Minimum published coverage per bag/pail for a trowel; ratio model or store-brand row when the maker lists none. */
export function thinsetCoverage(m: Mortar, trowelId: TrowelId): { cov: number; basis: CoverageBasis } {
  const c = m.cov[trowelId];
  if (c) return { cov: c[0], basis: "chart" };
  const t = trowel(trowelId);
  const q = m.cov.sq14;
  if (t.tEff && q) return { cov: (q[0] * 0.125) / t.tEff, basis: "ratio" };
  const b = mortar("basic").cov[trowelId] ?? mortar("basic").cov.sq38!;
  return { cov: b[0], basis: "fallback" };
}

export function mortarWarnings(m: Mortar, trowelId: TrowelId, longIn: number): string[] {
  const w: string[] = [];
  if (m.notRecommended?.includes(trowelId)) w.push(`${m.short}: the maker no longer recommends the ${trowel(trowelId).label} — the coverage shown is from its older chart.`);
  if (m.trowelNotes?.[trowelId]) w.push(m.trowelNotes[trowelId]!);
  if (longIn > LFT_SIDE_IN && m.lht === false) w.push(`${m.short} is not rated for large & heavy tile. Tile over ${LFT_SIDE_IN} in needs an LHT/LFT mortar (ANSI A118.4H or A118.15H).`);
  if (m.maxTileIn && longIn > m.maxTileIn) w.push(`${m.short} is meant for tile up to ${m.maxTileIn} in on a side.`);
  return w;
}

export function thinsetBags(i: { areaSqFt: number; mortarId: string; trowelId: TrowelId; backButter: boolean; wastePct?: number; longIn?: number }) {
  const m = mortar(i.mortarId);
  const area = pos(i.areaSqFt);
  const waste = i.wastePct ?? MORTAR_WASTE_PCT;
  const { cov, basis } = thinsetCoverage(m, i.trowelId);
  const trowelBags = cov > 0 ? (area * (1 + pos(waste) / 100)) / cov : 0;
  const bbBags = i.backButter ? (area * 144 * BACK_BUTTER_IN) / m.yieldIn3 : 0;
  const exact = trowelBags + bbBags;
  const bags = ceilQty(exact);
  return {
    mortar: m,
    cov,
    basis,
    trowelBags,
    bbBags,
    exact,
    bags,
    weightLb: m.unit === "lb" ? bags * m.size : bags * 12, // a 1-gal pail of pre-mix weighs about 12 lb
    cost: m.price != null ? bags * m.price : null,
    warnings: mortarWarnings(m, i.trowelId, i.longIn ?? 0),
  };
}

/* ───────── grout ───────── */

/** Joint volume, in³ (module method): A·144·(L+W+J)·J·T / ((L+J)(W+J)). */
export function jointVolumeIn3(areaSqFt: number, L: number, W: number, J: number, T: number): number {
  if (!(pos(areaSqFt) && pos(L) && pos(W) && pos(J) && pos(T))) return 0;
  return (areaSqFt * 144 * (L + W + J) * J * T) / ((L + J) * (W + J));
}

/** Grout by joint width: unsanded below 1/8 in, sanded from 1/8 in. */
export function autoGrout(jointIn: number): string {
  return jointIn < 0.125 ? "keracolor-u" : "keracolor-s";
}

export interface PackLine {
  pack: GroutPack;
  count: number;
}

export interface PackPlan {
  lines: PackLine[];
  amount: number;
  units: number;
  /** null when any pack used has no published price */
  cost: number | null;
}

/** Cheapest combination of pack sizes covering `need` (or least material when prices are missing). */
export function packPlan(need: number, packs: readonly GroutPack[]): PackPlan {
  if (!(need > 0) || packs.length === 0) return { lines: [], amount: 0, units: 0, cost: 0 };
  const priced = packs.every((p) => p.price != null);
  const maxes = packs.map((p) => Math.ceil(need / p.amount - 1e-9));
  const combos = maxes.reduce((a, m) => a * (m + 1), 1);
  let best: { counts: number[]; amount: number; units: number; cost: number } | null = null;
  const consider = (counts: number[]) => {
    const amount = counts.reduce((s, c, k) => s + c * packs[k].amount, 0);
    if (amount + 1e-9 < need) return;
    const units = counts.reduce((s, c) => s + c, 0);
    const cost = counts.reduce((s, c, k) => s + c * (packs[k].price ?? 0), 0);
    const better =
      !best ||
      (priced
        ? cost < best.cost - 1e-9 || (Math.abs(cost - best.cost) < 1e-9 && (amount < best.amount - 1e-9 || (Math.abs(amount - best.amount) < 1e-9 && units < best.units)))
        : amount < best.amount - 1e-9 || (Math.abs(amount - best.amount) < 1e-9 && units < best.units));
    if (better) best = { counts: [...counts], amount, units, cost };
  };
  if (combos <= 20000) {
    const counts = packs.map(() => 0);
    const rec = (k: number) => {
      if (k === packs.length) return consider(counts);
      for (let c = 0; c <= maxes[k]; c++) {
        counts[k] = c;
        rec(k + 1);
      }
      counts[k] = 0;
    };
    rec(0);
  } else {
    // Very large orders: largest packs, then the cheapest way to cover the remainder with one size.
    const order = packs.map((p, k) => k).sort((a, b) => packs[b].amount - packs[a].amount);
    const big = order[0];
    const base = Math.floor(need / packs[big].amount);
    for (const k of order) {
      const counts = packs.map(() => 0);
      counts[big] = base;
      counts[k] += Math.ceil(Math.max(0, need - base * packs[big].amount) / packs[k].amount - 1e-9);
      consider(counts);
    }
  }
  const b = best as { counts: number[]; amount: number; units: number; cost: number } | null;
  if (!b) return { lines: [], amount: 0, units: 0, cost: null };
  const lines = b.counts.map((count, k) => ({ pack: packs[k], count })).filter((l) => l.count > 0);
  return { lines, amount: b.amount, units: b.units, cost: lines.every((l) => l.pack.price != null) ? b.cost : null };
}

export function describePlan(plan: PackPlan): string {
  return plan.lines.map((l) => `${l.count} × ${l.pack.label}`).join(" + ") || "—";
}

/** lb per in³ of joint for a cement grout; small mosaics use the maker's heavier mosaic factor when published. */
export function groutK(g: Grout, pieceLongIn: number): number | null {
  if (g.k == null) return null;
  return g.mosaicK != null && pieceLongIn <= 2 ? g.mosaicK : g.k;
}

export function groutNeed(i: { areaSqFt: number; longIn: number; shortIn: number; thickIn: number; jointIn: number; groutId: string }) {
  const g = grout(i.groutId);
  const area = pos(i.areaSqFt);
  const vol = jointVolumeIn3(area, i.longIn, i.shortIn, i.jointIn, i.thickIn);
  const volX = vol * (1 + GROUT_EXTRA_PCT / 100);
  const k = groutK(g, Math.max(i.longIn, i.shortIn));
  const lb = k != null ? volX * k : null;
  const need = lb ?? volX;
  const plan = packPlan(need, g.packs);
  const perSqFt = area > 0 ? need / area : 0;
  const warnings: string[] = [];
  if (i.jointIn < g.jointMin - 1e-9) warnings.push(`${g.short} is for joints ${fmtJoint(g.jointMin)} in and wider — use an unsanded or fine-aggregate grout for a ${fmtJoint(i.jointIn)} in joint.`);
  if (i.jointIn > g.jointMax + 1e-9) warnings.push(`${g.short} is rated only up to ${fmtJoint(g.jointMax)} in joints — pick a sanded grout for ${fmtJoint(i.jointIn)} in.`);
  return {
    grout: g,
    volIn3: vol,
    volWithExtraIn3: volX,
    lb,
    plan,
    /** sq ft one of each pack covers */
    coverage: g.packs.map((p) => ({ pack: p, sqft: perSqFt > 0 ? p.amount / perSqFt : 0 })),
    warnings,
  };
}

/** 0.125 → "1/8" */
export function fmtJoint(inches: number): string {
  const s = Math.round(inches * 16);
  if (Math.abs(s / 16 - inches) > 1e-6 || s === 0) return String(Math.round(inches * 1000) / 1000);
  let n = s;
  let d = 16;
  while (n % 2 === 0 && d > 1) {
    n /= 2;
    d /= 2;
  }
  return d === 1 ? String(n) : `${n}/${d}`;
}

/* ───────── backer board ───────── */

export type BackerSurface = "floor" | "wall";

/** Fasteners per full sheet: 8-in grid on floors; on walls one row per stud (16 in o.c.) at 8 in; wedi 1 per sq ft. */
export function fastenersPerSheet(b: Backer, surface: BackerSurface): number {
  const W = b.wFt * 12;
  const L = b.lFt * 12;
  if (b.fastener === "wedi") return Math.ceil(b.wFt * b.lFt * BACKER_RULES.wediPerSqFt);
  const s = b.fastener === "goboard" ? BACKER_RULES.goboardSpacingIn : BACKER_RULES.cementSpacingIn;
  if (surface === "floor") return (Math.ceil(W / s - 1e-9) + 1) * (Math.ceil(L / s - 1e-9) + 1);
  const studs = Math.floor(W / BACKER_RULES.studSpacingIn) + 1;
  return studs * (Math.ceil(L / s - 1e-9) + 1);
}

export function backerPlan(i: { areaSqFt: number; backerId: string; surface: BackerSurface }) {
  const b = backer(i.backerId);
  const area = pos(i.areaSqFt);
  const sheetSqFt = b.wFt * b.lFt;
  const netSheets = area / sheetSqFt;
  const sheets = ceilQty(netSheets * (1 + BACKER_RULES.sheetWastePct / 100));
  const perSheet = fastenersPerSheet(b, i.surface);
  const fasteners = ceilQty(netSheets * perSheet * (1 + BACKER_RULES.fastenerExtraPct / 100));
  const fastenerPacks = b.fastener === "wedi" ? WEDI_FASTENER_PACKS : b.fastener === "goboard" ? [{ amount: GOBOARD_FASTENER_PACK, label: "box of 700 GoBoard fasteners" }] : SCREW_PACKS;
  const fastenerPlan = packPlan(fasteners, fastenerPacks);
  // Seams: in a sheet grid each board owns about one long and one short edge of seam (generous; covers inside corners).
  const tapeFt = b.kind === "cement" ? ceilQty(netSheets * (b.wFt + b.lFt)) : 0;
  const tapePlan = packPlan(tapeFt, MESH_TAPE_PACKS);
  // Floors: cement board is set in modified thinset with a 1/4 in square-notch trowel (James Hardie, USG).
  const under = i.surface === "floor" && b.kind === "cement" ? thinsetBags({ areaSqFt: area, mortarId: "basic", trowelId: "sq14", backButter: false }) : null;
  const sheetCost = b.price != null ? sheets * b.price : null;
  const warnings: string[] = [];
  if (i.surface === "wall" && b.floorOnly) warnings.push(`${b.short} is a floor and countertop board — walls and showers need 1/2 in (or 0.42 in HardieBacker 500) board.`);
  const cost = (sheetCost ?? 0) + (fastenerPlan.cost ?? 0) + (tapePlan.cost ?? 0) + (under?.cost ?? 0);
  return {
    backer: b,
    sheetSqFt,
    netSheets,
    sheets,
    perSheet,
    fasteners,
    fastenerPlan,
    tapeFt,
    tapePlan,
    under,
    weightLb: b.weightLb != null ? sheets * b.weightLb : null,
    sheetCost,
    cost,
    warnings,
  };
}

/* ───────── waterproofing ───────── */

export function waterproofPlan(id: WaterproofId, wallSqFt: number, panSqFt = 0) {
  const wall = pos(wallSqFt);
  const pan = pos(panSqFt);
  const x = 1 + WATERPROOF_EXTRA_PCT / 100;
  if (id === "kerdi") {
    const k = WATERPROOFING.kerdi;
    const sqft = (wall + pan) * x;
    const plan = packPlan(sqft, k.rolls);
    const bondBags = ceilQty(sqft / k.bondingSqFtPerBag);
    return { id, name: k.short, unit: "sq ft", need: sqft, plan, bondBags, bondCost: bondBags * k.allSetPrice, cost: (plan.cost ?? 0) + bondBags * k.allSetPrice };
  }
  const p = id === "redgard" ? WATERPROOFING.redgard : WATERPROOFING.hydroban;
  const gal = (wall / p.wallRate + pan / p.panRate) * x;
  const plan = packPlan(gal, p.packs);
  return { id, name: p.short, unit: "gal", need: gal, plan, bondBags: 0, bondCost: 0, cost: plan.cost ?? 0 };
}

/* ───────── installed (pro) cost ───────── */

export function installedRange(project: ProjectId, pattern: PatternId, areaSqFt: number, mosaic: boolean): [number, number] {
  const [lo, hi] = INSTALLED[project].range;
  const [pl, ph] = PATTERN_PREMIUM[pattern];
  const [ml, mh] = mosaic ? MOSAIC_PREMIUM : [0, 0];
  const a = pos(areaSqFt);
  return [a * lo * (1 + pl + ml), a * hi * (1 + ph + mh)];
}

/* ───────── whole tile job ───────── */

export interface TileInput {
  project: ProjectId;
  surfaces: Rect[];
  openings: Rect[];
  sizeId: string;
  custom?: CustomTile;
  chipIn?: number;
  /** price per sq ft, per piece (3×6) or per sheet (mosaic) — as the format is sold */
  price: number;
  jointIn: number;
  pattern: PatternId;
  /** null = recommended waste for the pattern and size */
  wastePct: number | null;
  atticPct: number;
  trowelId: TrowelId | "auto";
  mortarId: string;
  groutId: string;
  backerId: string | "none";
  waterproof: WaterproofId | "none";
}

export function computeTile(i: TileInput) {
  const area = netArea(i.surfaces, i.openings);
  const dims = tileDims(i.sizeId, i.custom, i.chipIn);
  const waste = i.wastePct ?? patternWaste(i.pattern, dims.longIn, area.net);
  const tiles = tileCount({ areaSqFt: area.net, dims, jointIn: i.jointIn, wastePct: waste, atticPct: i.atticPct });
  const perBox = boxPrice(dims, i.price);
  const tileCost = tiles.boxes * perBox;
  const trowelId = i.trowelId === "auto" ? autoTrowel(dims) : i.trowelId;
  const mortarId = i.mortarId === "auto" ? autoMortar(dims) : i.mortarId;
  const backButter = needsBackButter(dims.longIn);
  const thinset = thinsetBags({ areaSqFt: area.net, mortarId, trowelId, backButter, longIn: dims.longIn });
  const groutId = i.groutId === "auto" ? autoGrout(i.jointIn) : i.groutId;
  const groutR = groutNeed({ areaSqFt: area.net, longIn: dims.groutLongIn, shortIn: dims.groutShortIn, thickIn: dims.thickIn, jointIn: i.jointIn, groutId });
  const surface: BackerSurface = i.project === "floor" ? "floor" : "wall";
  const backerR = i.backerId !== "none" ? backerPlan({ areaSqFt: area.net, backerId: i.backerId, surface }) : null;
  const wp = i.waterproof !== "none" ? waterproofPlan(i.waterproof, area.net) : null;
  const materialCost = tileCost + (thinset.cost ?? 0) + (groutR.plan.cost ?? 0) + (backerR?.cost ?? 0) + (wp?.cost ?? 0);
  const installed = installedRange(i.project, i.pattern, area.net, dims.sheet);

  const warnings: string[] = [...thinset.warnings, ...groutR.warnings, ...(backerR?.warnings ?? [])];
  if (dims.format.wallOnly && i.project === "floor") warnings.push(`${dims.format.label} ${dims.format.sub} tile is sold as wall tile — check the carton for a floor rating before using it on a floor.`);
  if (i.pattern === "offset12" && dims.longIn > OFFSET_LIMIT_SIDE_IN) warnings.push(`ANSI A108.02 limits running-bond offsets to 33% on tile longer than ${OFFSET_LIMIT_SIDE_IN} in (unless the maker allows more) — a ½ offset on ${fmtDim(dims.longIn)} in tile shows lippage. Use a ⅓ offset.`);
  if (i.project === "shower" && i.waterproof === "none" && !(backerR && backerR.backer.kind === "foam")) warnings.push("Grout and cement board are not waterproof. Shower walls need a membrane (liquid or sheet) or a sealed foam-board system behind the tile.");

  return { area, dims, waste, tiles, perBox, tileCost, trowelId, mortarId, backButter, thinset, groutId, grout: groutR, surface, backer: backerR, wp, materialCost, installed, warnings };
}

export type TileResult = ReturnType<typeof computeTile>;

function fmtDim(n: number) {
  return String(Math.round(n * 100) / 100);
}
