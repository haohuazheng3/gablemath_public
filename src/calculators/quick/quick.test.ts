import { describe, expect, it } from "vitest";
import { QUICK_DEFS } from "./defs";
import { chartAt, BLOWN } from "./tools/blown-in";
import { boardFeet, doyle } from "./tools/board-foot";
import { frameWall } from "./tools/framing";
import { shapeArea } from "./tools/square-footage";
import { spaceBalusters } from "./tools/balusters";
import { sluBags } from "./tools/floor-coatings";
import { barRun } from "./tools/rebar";
import { planStairs } from "./tools/stairs";
import { wallpaperPlan } from "./tools/wallpaper";

const run = (key: string, patch: Record<string, unknown> = {}) => {
  const d = QUICK_DEFS[key];
  return d.compute({ ...d.defaults, ...patch } as never, { metric: false });
};
const num = (s: string) => Number(s.replace(/[^0-9.-]/g, ""));

describe("quick tools", () => {
  it("every tool computes its defaults without NaN", () => {
    for (const [key, d] of Object.entries(QUICK_DEFS)) {
      const r = d.compute(d.defaults, { metric: false });
      expect(r.hero.value, key).not.toMatch(/NaN|—/);
      expect(r.summary.length, key).toBeGreaterThan(5);
    }
  });

  it("square footage", () => {
    expect(shapeArea("rect", 12, 12, 0, 0)).toBe(144);
    expect(shapeArea("circle", 10, 0, 0, 0)).toBeCloseTo(78.54, 2);
    expect(shapeArea("lshape", 10, 12, 6, 8)).toBe(168);
    expect(run("measure/square-footage-calculator", { l: 30, w: 40 }).hero.value).toBe("1,200");
  });

  it("cubic yards", () => {
    const r = run("measure/cubic-yard-calculator", { l: 10, w: 10, d: 4, extra: 0 });
    expect(num(r.hero.value)).toBeCloseTo(1.23, 2);
    expect(num(run("measure/cubic-yard-calculator", { shape: "cuft", l: 27, extra: 0 }).hero.value)).toBe(1);
  });

  it("tons ↔ yards", () => {
    expect(num(run("measure/tons-to-cubic-yards", { dir: "t2y", qty: 10, mat: "57" }).hero.value)).toBeCloseTo(7.41, 2);
    expect(num(run("measure/tons-to-cubic-yards", { dir: "y2t", qty: 2, custom: true, pcf: 100 }).hero.value)).toBe(2.7);
  });

  it("drywall: 12×12×8 room with ceiling, 1 door, 2 windows → 17 sheets", () => {
    expect(run("walls/drywall-calculator").hero.value).toBe("17");
  });

  it("blown-in chart interpolation", () => {
    expect(chartAt(BLOWN.fiberglass.rows, 38).bagsPer1000).toBe(19);
    expect(chartAt(BLOWN.fiberglass.rows, 50).bagsPer1000).toBeCloseTo(25.59, 2);
    expect(run("walls/blown-in-insulation-calculator", { mode: "area", area: 1000, zone: "4A/4B", exist: "fiberglass", depth: 4 }).hero.value).toBe("26");
    expect(run("walls/blown-in-insulation-calculator", { mode: "area", area: 1000, target: 38, exist: "none", mat: "cellulose" }).hero.value).toBe("53");
  });

  it("board feet and Doyle", () => {
    expect(boardFeet(2, 4, 8)).toBeCloseTo(5.333, 3);
    expect(doyle(20, 16)).toBe(256);
  });

  it("wall framing", () => {
    const r = frameWall({ lengthFt: 24, spacingIn: 16, corners: 2, tees: 0, openings: 2, openingWidthIn: 36, wastePct: 10 });
    expect(r.layout).toBe(19);
    expect(r.fullLength).toBe(27);
    expect(r.studs).toBe(30);
  });

  it("roof sheathing 40×28, 6/12, 1 ft overhang → 49 sheets", () => {
    expect(run("lumber/plywood-calculator").hero.value).toBe("49");
  });

  it("deck 16×12 with 5/4 boards", () => {
    const r = run("lumber/deck-calculator");
    expect(r.hero.value).toBe("29");
    expect(r.stats?.[1].value).toBe("OK");
    expect(run("lumber/deck-calculator", { joist: "2x8" }).stats?.[1].value).toBe("Too long");
  });

  it("masonry: BIA modular 6.75/sq ft, block 1.125/sq ft, Quikrete bag yields", () => {
    expect(run("concrete/brick-calculator", { len: 10, h: 10, windows: 0, waste: 0 }).hero.value).toBe("675");
    expect(run("concrete/concrete-block-calculator", { len: 40, h: 4, waste: 0, caps: false }).hero.value).toBe("180");
    expect(run("concrete/mortar-calculator", { unit: "block", count: 120, waste: 0 }).hero.value).toBe("10");
    expect(run("concrete/mortar-calculator", { unit: "brick", count: 370, waste: 0 }).hero.value).toBe("10");
  });

  it("concrete weight: 1 yd³ at 145 pcf = 3,915 lb", () => {
    expect(run("concrete/concrete-weight-calculator", { shape: "yd", yd: 1 }).hero.value).toBe("3,915");
  });

  it("rebar grid", () => {
    const r = barRun(20, 20, 18, (40 * 0.5) / 12);
    expect(r.bars).toBe(14);
    expect(r.len).toBe(19.5);
    expect(r.splices).toBe(0);
    expect(barRun(30, 10, 12, 20 / 12).splices).toBe(1);
  });

  it("stairs: 108 in rise at 7.5 in target → 15 risers of 7.2 in", () => {
    const s = planStairs(108, 7.5, 10.5);
    expect(s.risers).toBe(15);
    expect(s.riser).toBeCloseTo(7.2, 3);
    expect(s.treads).toBe(14);
    expect(s.runIn).toBe(147);
  });

  it("balusters keep gaps under 4 in", () => {
    const r = spaceBalusters(72, 1.5, 3.5);
    expect(r.n).toBe(14);
    expect(r.gap).toBeLessThan(4);
    expect(r.gap).toBeCloseTo(3.4, 1);
  });

  it("wallpaper strips and rolls", () => {
    const p = wallpaperPlan(48, 8, 20.5, 33, 21, "straight", 36);
    expect(p.cut).toBe(105);
    expect(p.perRoll).toBe(3);
    expect(p.strips).toBe(28);
    expect(p.rolls).toBe(10);
  });

  it("self-leveler: 144 sq ft at 1/4 in = 6 bags before waste", () => {
    expect(sluBags(144, 0.25, 0).bags).toBe(6);
  });

  it("epoxy: 100% solids at 10 mils = 160 sq ft/gal", () => {
    const r = run("flooring/epoxy-floor-calculator", { prod: "solids", size: "custom", l: 16, w: 10, solids: 100, mils: 10, coats: 1, top: false });
    expect(r.hero.value).toBe("1");
  });

  it("batch 3: sod, seed, pavers, wall, stone, asphalt, sealer, siding, gutters", () => {
    expect(run("landscaping/sod-calculator", { mode: "area", area: 450, waste: 0, pallet: 450 }).hero.value).toBe("1");
    expect(run("landscaping/grass-seed-calculator", { mode: "area", area: 1000, seed: "tf", job: "new" }).hero.value).toBe("6–9");
    expect(run("landscaping/paver-calculator", { shape: "area", area: 100, size: "4x8", waste: 0 }).hero.value).toBe("450");
    expect(run("landscaping/retaining-wall-calculator", { len: 10, h: 1, block: "large" }).hero.value).toBe("23");
    expect(run("landscaping/pea-gravel-calculator", { shape: "area", l: 270, d: 4, extra: 0 }).hero.value).toBe("4.67");
    expect(run("landscaping/asphalt-calculator", { l: 90, w: 10, t: 2 }).hero.value).toBe("11");
    expect(run("landscaping/driveway-sealer-calculator", { l: 50, w: 10, surf: "rough", coats: 2, cov: 0 }).hero.value).toBe("4");
    expect(run("roofing/siding-calculator", { l: 40, w: 30, h: 10, stories: 1, gables: 0, doors: 0, windows: 0, garage: 0, waste: 0 }).hero.value).toBe("14");
    expect(run("roofing/gutter-calculator", { eaves: 120, price: 10, spacing: 30 }).hero.value).toBe("$1,200");
  });

  it("batch 4: electricity and solar battery", () => {
    expect(run("electricity/watts-to-amps-calculator", { dir: "w2a", watts: 3000, volts: 120, phase: "single", pf: 1 }).hero.value).toBe("25");
    expect(run("electricity/watts-to-amps-calculator", { dir: "a2w", amps: 15, volts: 120, phase: "single", pf: 1 }).hero.value).toBe("1,800");
    expect(run("electricity/kwh-calculator", { watts: 1000, hours: 1, days: 30, qty: 1 }).hero.value).toBe("30");
    expect(run("electricity/electric-bill-calculator", { kwh: 1000, state: "custom", cents: 15, fixed: 10 }).hero.value).toBe("$160.00");
    expect(run("electricity/btu-calculator", { l: 12, w: 12, h: 8, sun: "normal", people: 2, kitchen: false }).hero.value).toBe("5,000");
    expect(run("electricity/btu-calculator", { l: 20, w: 25, h: 8, sun: "normal", people: 2, kitchen: false }).hero.value).toBe("12,000");
    expect(run("electricity/heating-btu-calculator", { mode: "area", area: 1000, h: 8, zone: "4", ins: "avg" }).hero.value).toBe("45,000");
    expect(run("electricity/generator-size-calculator", { fridge: true, sump: false, furnace: false, micro: false, tv: false, computer: false, lights: 0, other: 0 }).hero.value).toBe("2,900");
    expect(run("solar/solar-battery-calculator", { mode: "backup", daily: 9, days: 1, chem: "lfp" }).hero.value).toBe("10");
    expect(run("solar/solar-battery-calculator", { mode: "runtime", ah: 200, bv: 12, load: 216 }).hero.value).toBe("10");
  });
});
