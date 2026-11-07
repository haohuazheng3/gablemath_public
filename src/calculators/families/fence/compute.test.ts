import { describe, expect, it } from "vitest";
import {
  annulusCuft,
  autoEmbedIn,
  bagsFor,
  bandsPerTensionBar,
  computeChainLink,
  computeFence,
  computeFenceCost,
  diyMaterials,
  planLayout,
  ptPostPrice,
  quikreteOfficialBags,
  railsPerSection,
  roundAreaSqIn,
  standardChainLinkInput,
  standardFenceInput,
  stockPostFt,
} from "./compute";
import { CHAIN_LINK_DEFAULTS, chainLinkInputFrom } from "./chain-link-model";
import { FENCE_COST_DEFAULTS, fenceCostInputFrom } from "./cost-model";
import { HD_STOCKADE_PER_8FT, PICKET_PALLET, POST_MIXES } from "./data";
import { FENCE_DEFAULTS, fenceInputFrom, styleDefaults } from "./fence-model";
import { straightRun } from "./layout-model";

const fence = (over: Partial<typeof FENCE_DEFAULTS>) => computeFence(fenceInputFrom({ ...FENCE_DEFAULTS, ...over }));
const straight = (len: number, over: Partial<typeof FENCE_DEFAULTS> = {}) => fence({ ...straightRun(len), ...over });
const chain = (over: Partial<typeof CHAIN_LINK_DEFAULTS>) => computeChainLink(chainLinkInputFrom({ ...CHAIN_LINK_DEFAULTS, ...over }));

describe("Home Depot fence sheet", () => {
  it("18 stockade pickets per 8 ft section (ceil 96 / 5.5)", () => {
    expect(straight(8, { waste: 0 }).pickets?.net).toBe(HD_STOCKADE_PER_8FT);
  });
  it("rails: ≤ 24 in apart — a 6 ft fence needs three", () => {
    expect(railsPerSection(6)).toBe(3);
    expect(railsPerSection(4)).toBe(2);
    expect(railsPerSection(3)).toBe(2);
    expect(railsPerSection(8)).toBe(4);
    expect(railsPerSection(6, 4)).toBe(4);
  });
  it("6 fasteners per picket and 9 per 3-rail section", () => {
    const r = straight(8, { waste: 0 });
    expect(r.fasteners.picket).toBe(18 * 6);
    expect(r.fasteners.rail).toBe(9);
  });
  it("posts no more than 8 ft on center, even if you ask for more", () => {
    const r = straight(100, { sp: 10 });
    expect(r.spacingFt).toBe(8);
    expect(r.layout.sections).toBe(13);
    expect(r.layout.runs[0].spacing).toBeCloseTo(100 / 13, 6);
  });
});

describe("pickets", () => {
  it("100 ft privacy: 219 pickets butted, 241 with 10% extra", () => {
    const r = straight(100);
    expect(r.pickets?.net).toBe(219);
    expect(r.pickets?.withWaste).toBe(241);
  });
  it("a 560-picket pallet covers about 257 ft of privacy fence", () => {
    const perFt = straight(100).pickets!.perFt;
    expect(PICKET_PALLET / perFt).toBeCloseTo(256.7, 1);
  });
  it("board-on-board: 3.0 per ft at 1.5 in overlap, 2.67 at 1 in, 2.4 at 0.5 in", () => {
    expect(straight(100, { style: "bob", ov: 1.5 }).pickets?.perFt).toBeCloseTo(3, 6);
    expect(straight(100, { style: "bob", ov: 1 }).pickets?.perFt).toBeCloseTo(2.667, 3);
    expect(straight(100, { style: "bob", ov: 0.5 }).pickets?.perFt).toBeCloseTo(2.4, 6);
    expect(straight(100, { style: "bob", ov: 1.5, waste: 0 }).pickets?.net).toBe(300);
  });
  it("board-on-board front gap and a bad overlap warning", () => {
    expect(straight(50, { style: "bob", ov: 1.5 }).pickets?.frontGapIn).toBe(2.5);
    expect(straight(50, { style: "bob", ov: 3 }).warnings.some((w) => w.includes("half the board"))).toBe(true);
  });
  it("spaced pickets: 3.5 in boards with 2.5 in gaps = 2 per ft", () => {
    const r = straight(100, { ...styleDefaults("picket"), waste: 0 });
    expect(r.pickets?.net).toBe(200);
    expect(r.pickets?.lengthFt).toBe(4);
    expect(r.railsPerSection).toBe(2);
  });
  it("gate leaves get their own pickets and frame boards", () => {
    const r = fence({ ...straightRun(100), wg: 1, ww: 48, waste: 0 });
    expect(r.pickets?.net).toBe(ceil((96 * 12) / 5.5));
    expect(r.pickets?.gate).toBe(9);
    expect(r.gateFrameBoards).toBe(3);
  });
});

describe("layout: corners, ends, gates", () => {
  it("straight run: sections + 1 posts", () => {
    const l = planLayout([100], false, [], 8);
    expect(l.counts).toEqual({ end: 2, corner: 0, gate: 0, line: 12 });
    expect(l.posts).toBe(14);
  });
  it("Master Halco even division: 31 ft → 7 ft 9 in, 51 ft → 8 ft 6 in at 10 ft max", () => {
    expect(planLayout([31], false, [], 10).runs[0].spacing).toBeCloseTo(7.75, 6);
    expect(planLayout([51], false, [], 10).runs[0].spacing).toBeCloseTo(8.5, 6);
  });
  it("U-shape has 2 corners and 2 ends; a closed rectangle has 4 corners and no ends", () => {
    const u = planLayout([50, 100, 50], false, [], 8);
    expect(u.counts.corner).toBe(2);
    expect(u.counts.end).toBe(2);
    const box = planLayout([40, 60, 40, 60], true, [], 8);
    expect(box.counts.corner).toBe(4);
    expect(box.counts.end).toBe(0);
    // a "loop" of two sides can't close
    expect(planLayout([40, 60], true, [], 8).counts.end).toBe(2);
  });
  it("each gate adds two gate posts and splits its side evenly", () => {
    const l = planLayout([100], false, [{ widthFt: 4, double: false, run: 0 }], 8);
    expect(l.counts.gate).toBe(2);
    expect(l.fencedFt).toBe(96);
    // two 48-ft segments → 6 sections each
    expect(l.sections).toBe(12);
    expect(l.counts.line).toBe(10);
    expect(l.walkGates).toBe(1);
  });
  it("gates on a missing side fall back to the first side; oversized gates are flagged", () => {
    const l = planLayout([20, 0, 30], false, [{ widthFt: 12, double: true, run: 1 }], 8);
    expect(l.runs).toHaveLength(2);
    expect(l.runs[0].gates).toHaveLength(1);
    expect(planLayout([10], false, [{ widthFt: 12, double: true, run: 0 }], 8).overfull).toBe(true);
  });
  it("zero and empty input produce nothing", () => {
    const l = planLayout([0], false, [{ widthFt: 4, double: false, run: 0 }], 8);
    expect(l.posts).toBe(0);
    expect(l.counts.gate).toBe(0);
    const r = straight(0);
    expect(r.pickets?.net).toBe(0);
    expect(r.concrete.bags).toBe(0);
    expect(r.materialCost).toBe(0);
  });
});

describe("post depth and length", () => {
  it("Quikrete: bury half the above-ground height (24 in floor)", () => {
    expect(autoEmbedIn(6)).toBe(36);
    expect(autoEmbedIn(8)).toBe(48);
    expect(autoEmbedIn(4)).toBe(24);
    expect(autoEmbedIn(3)).toBe(24);
  });
  it("6 ft fence: 9 ft needed → buy 10 ft posts, hole 40 in with 4 in gravel", () => {
    const r = straight(100);
    const line = r.posts.find((p) => p.kind === "line")!;
    expect(line.minLengthFt).toBe(9);
    expect(line.stockFt).toBe(10);
    expect(line.holeDepthIn).toBe(40);
  });
  it("frost depth deepens posts; gate posts go 6 in below it", () => {
    const r = fence({ frost: 42 });
    expect(r.posts.find((p) => p.kind === "line")?.embedIn).toBe(42);
    expect(r.posts.find((p) => p.kind === "gate")?.embedIn).toBe(48);
    expect(r.posts.find((p) => p.kind === "gate")?.size).toBe("6x6");
  });
  it("stock lengths and special orders", () => {
    expect(stockPostFt(9)).toEqual({ ft: 10, special: false });
    expect(stockPostFt(8)).toEqual({ ft: 8, special: false });
    expect(stockPostFt(12.5)).toEqual({ ft: 14, special: true });
  });
  it("prices: researched lengths exact, others flagged as estimates", () => {
    expect(ptPostPrice("4x4", 10)).toEqual({ price: 19.68 });
    const est = ptPostPrice("4x4", 12);
    expect(est.price).toBeCloseTo(23.62, 2);
    expect(est.estimate).toBeDefined();
  });
  it("a shallow manual depth warns", () => {
    expect(fence({ emb: 24 }).warnings.some((w) => w.includes("third of the post"))).toBe(true);
  });
});

describe("concrete per post — Quikrete yields and published tables", () => {
  it("Quikrete calculator.js table (round post, 3× hole, full depth)", () => {
    expect([24, 30, 36, 42, 48].map((d) => quikreteOfficialBags(4, d))).toEqual([4, 5, 6, 7, 8]);
    expect([18, 24, 30, 36].map((d) => quikreteOfficialBags(3, d))).toEqual([2, 3, 3, 4]);
    expect(quikreteOfficialBags(2, 18)).toBe(1);
    expect(quikreteOfficialBags(6, 48)).toBe(17);
  });
  it("Sakrete 10 in hole table equals a full-depth 4×4 fill (3 bags at 30 in)", () => {
    expect(annulusCuft(10, 12.25, 30) / 0.38).toBeCloseTo(3.03, 2);
    expect(annulusCuft(10, 12.25, 12) / 0.38).toBeCloseTo(1.21, 2);
  });
  it("realistic table: 4×4 in a 10 in hole, 30 in deep with 4 in gravel & 3 in cap", () => {
    const cuft = annulusCuft(10, 12.25, 30 - 4 - 3);
    expect(cuft).toBeCloseTo(0.88, 2);
    expect(bagsFor(cuft, POST_MIXES.fs50.yieldCuft)).toBe(3);
    expect(bagsFor(cuft, POST_MIXES.cm80.yieldCuft)).toBe(2);
    expect(bagsFor(annulusCuft(10, 12.25, 42 - 7), POST_MIXES.fs50.yieldCuft)).toBe(4);
    expect(annulusCuft(12, 30.25, 36 - 7)).toBeCloseTo(1.39, 2);
    expect(annulusCuft(10, 25, 30 - 7)).toBeCloseTo(0.71, 2);
  });
  it("fence totals round per post (dry-pour bags can't be split between holes)", () => {
    const r = straight(100, { gp6: false });
    const line = r.posts.find((p) => p.kind === "line")!;
    // 6 ft fence: 36 in embed − 3 in cap = 33 in of concrete → 1.27 cu ft → 4 × 50 lb
    expect(line.concreteCuftEach).toBeCloseTo(1.266, 2);
    expect(line.bagsEach).toBe(4);
    expect(r.concrete.bags).toBe(14 * 4);
    expect(r.concrete.pooledBags).toBe(Math.ceil((14 * line.concreteCuftEach) / 0.375));
    expect(r.concrete.waterGal[0]).toBe(56);
    expect(r.fullHoleBagsLine).toBeGreaterThan(line.bagsEach);
  });
  it("a wider hole takes more concrete; a hole no wider than the post warns", () => {
    const wide = straight(100, { hole: 12 }).posts.find((p) => p.kind === "line")!;
    expect(wide.holeIn).toBe(12);
    expect(wide.concreteCuftEach).toBeCloseTo(annulusCuft(12, 12.25, 33), 6);
    expect(straight(100, { hole: 3 }).warnings.some((w) => w.includes("no room for concrete"))).toBe(true);
  });
  it("gravel-set line posts use no concrete", () => {
    const mixed = straight(100, { set: "mixed" });
    expect(mixed.posts.find((p) => p.kind === "line")?.bagsEach).toBe(0);
    expect(mixed.posts.find((p) => p.kind === "end")?.bagsEach).toBeGreaterThan(0);
    const gravel = straight(100, { set: "gravel" });
    expect(gravel.concrete.bags).toBe(0);
    expect(gravel.gravel.bags).toBeGreaterThan(mixed.gravel.bags);
  });
  it("deep holes trigger the 30 in lift rule", () => {
    expect(straight(100, { h: 8 }).warnings.some((w) => w.includes("lifts"))).toBe(true);
  });
});

describe("panels and vinyl", () => {
  it("wood panels: one 6×8 panel per 8 ft section", () => {
    const r = straight(100, styleDefaults("panel"));
    expect(r.panels).toBe(13);
    expect(r.railBoards).toBe(0);
    expect(r.fasteners.panelBrackets).toBe(13 * 3 * 2);
  });
  it("panel fences keep full 8-ft panels and cut only the last one", () => {
    const l = planLayout([100], false, [], 8, false);
    const lines = l.runs[0].posts.filter((p) => p.kind === "line").map((p) => p.d);
    expect(lines[0]).toBe(8);
    expect(lines[lines.length - 1]).toBe(96);
    expect(l.counts.line).toBe(12);
  });
  it("vinyl: 97 in centers (Catalyst Premium LX) → 13 panels for 100 ft", () => {
    const r = straight(100, styleDefaults("vinyl"));
    expect(r.panels).toBe(13);
    expect(r.posts.every((p) => p.size === "vinyl")).toBe(true);
    expect(r.posts.find((p) => p.kind === "line")?.holeDepthIn).toBe(36 + 6);
  });
  it("vinyl gate posts need stiffeners", () => {
    const r = fence({ ...styleDefaults("vinyl"), wg: 2 });
    expect(r.hardware.stiffeners).toBe(4);
    expect(r.materials.some((m) => m.id === "stiffeners")).toBe(true);
  });
});

describe("chain link (Merchants Metals / Master Halco)", () => {
  it("50 ft rolls and 10 ft top rail pieces", () => {
    const r = chain({ ...straightRun(300) });
    expect(r.rolls).toBe(6);
    expect(r.topRailPieces).toBe(30);
    expect(chain({ ...straightRun(101) }).rolls).toBe(3);
  });
  it("tension bands per bar: 3 for 3 ft, 42 in, 4 ft; 4 for 5 ft; 5 for 6 ft", () => {
    expect([3, 3.5, 4, 5, 6].map(bandsPerTensionBar)).toEqual([3, 3, 3, 4, 5]);
  });
  it("corners take two tension bars; fittings follow the bars", () => {
    const r = chain({ runs: 3, r1: 50, r2: 100, r3: 50, wg: 0, dg: 0, h: 4 });
    expect(r.fittings.tensionBars).toBe(2 + 2 * 2);
    expect(r.fittings.tensionBands).toBe(18);
    expect(r.fittings.braceBands).toBe(6);
    expect(r.fittings.carriageBolts).toBe(24);
  });
  it("100 ft straight at 10 ft spacing: 9 line posts, ties per foot of post and rail", () => {
    const r = chain({ ...straightRun(100), h: 4 });
    expect(r.line.count).toBe(9);
    expect(r.terminal.count).toBe(2);
    expect(r.fittings.lineTies).toBe(36);
    expect(r.fittings.railTies).toBe(50);
    expect(r.fittings.hogRings).toBe(50);
  });
  it("post lengths: terminal fabric + 2 in, line fabric − 2 in, plus embedment", () => {
    const r = chain({ ...straightRun(100), h: 4 });
    expect(r.line.minLengthIn).toBe(46 + 20);
    expect(r.terminal.minLengthIn).toBe(50 + 26);
    expect(r.line.price.price).toBe(17.99);
  });
  it("concrete matches the realistic table (terminal 2 × 50 lb, line 1 × 50 lb)", () => {
    const r = chain({ ...straightRun(100) });
    expect(annulusCuft(8, roundAreaSqIn(2.375), 23)).toBeCloseTo(0.61, 2);
    expect(r.terminal.bagsEach).toBe(2);
    expect(r.line.bagsEach).toBe(1);
  });
  it("gates: hinges, latches, drop rods and gate openings removed from fabric", () => {
    const r = chain({ ...straightRun(100), wg: 1, ww: 48, dg: 1, dw: 12 });
    expect(r.fabricFt).toBe(84);
    expect(r.fittings.postHinges).toBe(2 + 4);
    expect(r.fittings.latches).toBe(2);
    expect(r.fittings.dropRods).toBe(1);
    expect(r.gatePosts.count).toBe(4);
  });
  it("spacing is capped at 10 ft", () => {
    const r = chain({ ...straightRun(100), sp: 12 });
    expect(r.spacingFt).toBe(10);
    expect(r.warnings.some((w) => w.includes("10 ft"))).toBe(true);
  });
});

describe("installed cost", () => {
  it("150 ft wood privacy tops out at Modernize's $6,750; chain link starts at $1,500", () => {
    const wood = computeFenceCost(fenceCostInputFrom({ ...FENCE_COST_DEFAULTS, wg: 0 }));
    expect(wood.fence).toEqual([2250, 6750]);
    const cl = computeFenceCost(fenceCostInputFrom({ ...FENCE_COST_DEFAULTS, mat: "chain-link", wg: 0 }));
    expect(cl.fence[0]).toBe(1500);
  });
  it("adds gates, removal and pro staining", () => {
    const r = computeFenceCost(fenceCostInputFrom({ ...FENCE_COST_DEFAULTS, len: 100, wg: 1, rem: true, stain: true, sides: 2, h: 6 }));
    expect(r.gates).toEqual([150, 250]);
    expect(r.removal).toEqual([200, 500]);
    expect(r.stain?.[0]).toBeCloseTo(1.33 * 1200, 6);
    expect(r.total[0]).toBeCloseTo(1500 + 150 + 200 + 1596, 6);
  });
  it("gates without a price source are counted, not guessed", () => {
    const r = computeFenceCost(fenceCostInputFrom({ ...FENCE_COST_DEFAULTS, mat: "aluminum", wg: 2 }));
    expect(r.gatesUnpriced).toBe(2);
    expect(r.gates).toEqual([0, 0]);
  });
  it("quote check and DIY estimate", () => {
    const r = computeFenceCost(fenceCostInputFrom({ ...FENCE_COST_DEFAULTS, len: 100, wg: 0, quote: 5000 }));
    expect(r.quote?.position).toBe("above");
    expect(r.diy?.materials).toBeGreaterThan(0);
    expect(diyMaterials("aluminum", 100, 4, 0, 0)).toBeUndefined();
    expect(diyMaterials("wood-privacy", 0, 6, 0, 0)).toBeUndefined();
  });
  it("huge fences scale linearly", () => {
    const r = computeFenceCost(fenceCostInputFrom({ ...FENCE_COST_DEFAULTS, len: 5000, wg: 0 }));
    expect(r.fence).toEqual([75000, 225000]);
  });
});

describe("standard builds", () => {
  it("standard inputs compute without warnings", () => {
    expect(computeFence(standardFenceInput("picket", [100], 4, [])).warnings).toEqual([]);
    expect(computeChainLink(standardChainLinkInput([100], 4, [])).warnings).toEqual([]);
  });
});

function ceil(n: number) {
  return Math.ceil(n - 1e-9);
}
