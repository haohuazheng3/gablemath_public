import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { formatFeetInches } from "@/lib/units";
import { annulusCuft, autoEmbedIn, bagsFor, computeFence, quikreteOfficialBags, stockPostFt, type FenceResult } from "./compute";
import {
  FENCE_CHECKED,
  FENCE_SOURCES,
  FROST_EXAMPLE,
  HOLE,
  MODERNIZE_150FT,
  PICKET_PALLET,
  POST_MIXES,
  STYLES,
  installed,
  type FenceStyle,
} from "./data";
import FenceCalculator from "./FenceCalculator";
import { FENCE_DEFAULTS, fenceInputFrom, styleDefaults, type FenceValues } from "./fence-model";
import { straightRun } from "./layout-model";

const SLUG = "fence-calculator";
const BASE = `/fence/${SLUG}`;
const FS = POST_MIXES.fs50;

/** A straight, gate-free run of the standard build — the scenario behind "how many … for N ft". */
function valuesFor(style: FenceStyle, lengthFt: number, heightFt?: number): FenceValues {
  return { ...FENCE_DEFAULTS, ...styleDefaults(style), ...straightRun(lengthFt), ...(heightFt ? { h: heightFt } : {}) };
}

const run = (v: FenceValues) => computeFence(fenceInputFrom(v));
const proRange = (style: FenceStyle) => installed(style === "picket" ? "wood-picket" : style === "vinyl" ? "vinyl" : "wood-privacy");
const unitsOf = (r: FenceResult) => (r.pickets ? `${fmtInt(r.pickets.withWaste)} pickets` : `${fmtInt(r.panels)} panels`);

/* ───────── programmatic presets ───────── */

type Spec = { style: FenceStyle; len: number; h?: number; group: string; h1: string };

const SPECS: Spec[] = [
  { style: "privacy", len: 50, group: "Wood privacy fence (6 ft)", h1: "How many pickets for a 50 ft privacy fence?" },
  { style: "privacy", len: 75, group: "Wood privacy fence (6 ft)", h1: "How much material for a 75 ft privacy fence?" },
  { style: "privacy", len: 100, group: "Wood privacy fence (6 ft)", h1: "How many pickets for a 100 ft privacy fence?" },
  { style: "privacy", len: 150, group: "Wood privacy fence (6 ft)", h1: "How many pickets and posts for a 150 ft fence?" },
  { style: "privacy", len: 200, group: "Wood privacy fence (6 ft)", h1: "How many posts for a 200 ft fence?" },
  { style: "privacy", len: 250, group: "Wood privacy fence (6 ft)", h1: "Pickets, posts and concrete for a 250 ft privacy fence" },
  { style: "privacy", len: 300, group: "Wood privacy fence (6 ft)", h1: "How many pickets and posts for a 300 ft privacy fence?" },
  { style: "privacy", len: 100, h: 8, group: "Wood privacy fence (6 ft)", h1: "Materials for a 100 ft, 8 ft tall privacy fence" },
  { style: "bob", len: 100, group: "Board-on-board & picket", h1: "How many pickets for a 100 ft board-on-board fence?" },
  { style: "bob", len: 150, group: "Board-on-board & picket", h1: "How many pickets for a 150 ft board-on-board fence?" },
  { style: "picket", len: 50, group: "Board-on-board & picket", h1: "How many pickets for a 50 ft picket fence?" },
  { style: "picket", len: 100, group: "Board-on-board & picket", h1: "How many pickets for a 100 ft picket fence?" },
  { style: "panel", len: 100, group: "Panels: wood & vinyl", h1: "How many 6x8 fence panels for 100 ft?" },
  { style: "panel", len: 150, group: "Panels: wood & vinyl", h1: "How many 6x8 fence panels for 150 ft?" },
  { style: "vinyl", len: 100, group: "Panels: wood & vinyl", h1: "How many vinyl fence panels for 100 ft?" },
  { style: "vinyl", len: 150, group: "Panels: wood & vinyl", h1: "How many vinyl fence panels for 150 ft?" },
  { style: "vinyl", len: 200, group: "Panels: wood & vinyl", h1: "How many vinyl fence panels and posts for 200 ft?" },
];

const SLUG_STYLE: Record<FenceStyle, string> = { privacy: "privacy-fence", bob: "board-on-board-fence", picket: "picket-fence", panel: "wood-panel-fence", vinyl: "vinyl-fence" };
const TITLE_STYLE: Record<FenceStyle, string> = { privacy: "Privacy Fence", bob: "Board-on-Board Fence", picket: "Picket Fence", panel: "6x8 Wood Panel Fence", vinyl: "Vinyl Fence" };
const NOUN_STYLE: Record<FenceStyle, string> = { privacy: "wood privacy fence", bob: "board-on-board fence", picket: "picket fence", panel: "6×8 wood panel fence", vinyl: "vinyl privacy fence" };

export const FENCE_PRESETS: Preset<FenceValues>[] = SPECS.map((s) => {
  const v = valuesFor(s.style, s.len, s.h);
  const r = run(v);
  const tall = s.h && s.h !== STYLES[s.style].heightFt ? `${s.h}-ft-` : "";
  return {
    slug: `${s.len}-ft-${tall}${SLUG_STYLE[s.style]}`,
    values: v,
    group: s.group,
    label: `${s.len} ft ${STYLES[s.style].short.toLowerCase()}${tall ? `, ${s.h} ft tall` : ""}`,
    h1: s.h1,
    metaTitle: `${s.len} ft ${tall ? `${s.h} ft ` : ""}${TITLE_STYLE[s.style]}: ${r.pickets ? "Pickets" : "Panels"}, Posts & Concrete`,
    metaDescription: `A ${s.len} ft ${NOUN_STYLE[s.style]}, ${v.h} ft tall: ${unitsOf(r)}, ${r.layout.posts} posts and ${r.concrete.bags} bags of concrete. Full list and cost.`,
  };
});

function postsSentence(r: FenceResult): string {
  const line = r.layout.counts.line;
  return `${fmtInt(r.layout.posts)} posts — ${fmtInt(line)} line posts plus ${r.layout.counts.end} end posts`;
}

/** Facts that change with the scenario — the style, the length band or the height. */
function scenarioNotes(v: FenceValues, r: FenceResult): string[] {
  const L = r.layout.totalFt;
  const out: string[] = [];
  const wood150 = MODERNIZE_150FT[r.style === "vinyl" ? "vinyl" : "wood-privacy"];
  if (r.heightFt > 7) out.push(`Codes based on the IRC exempt fences up to 7 ft from a building permit, so ${r.heightFt === 8 ? "an" : "a"} ${r.heightFt}-ft fence needs one — and zoning or HOA rules may cap backyard fences lower.`);
  if (r.pickets && r.style === "privacy" && r.pickets.withWaste >= PICKET_PALLET * 0.75)
    out.push(
      `${fmtInt(r.pickets.withWaste)} pickets is ${r.pickets.withWaste < PICKET_PALLET ? "close to" : `${fmt(r.pickets.withWaste / PICKET_PALLET, 1)} times`} Home Depot's ${PICKET_PALLET}-picket full pallet (about 257 ft of privacy fence). Ask about pallet pricing and delivery — a pallet weighs roughly 1,600 lb.`,
    );
  if (L === 150 && wood150 && r.style !== "picket") out.push(`Modernize's August 2026 figures put a 150-ft ${r.style === "vinyl" ? "vinyl" : "wood"} fence at ${fmtMoney(wood150[0])}–${fmtMoney(wood150[1])} installed.`);
  if (r.style === "bob") out.push(`The back boards sit on ${fmt(r.pickets!.pitchIn * 2, 1)}-in centers with ${fmt(r.pickets!.frontGapIn ?? 0, 1)}-in gaps; the front layer covers each gap with ${fmt(v.ov, 2)} in to spare on both edges, so normal shrinkage won't open a see-through gap.`);
  if (r.style === "picket")
    out.push("Fencing a pool? CPSC guidance calls for at least 48 in of height and gaps no wider than 1-3/4 in when rails are less than 45 in apart, so a 4-ft picket fence with 2-1/2 in gaps does not qualify.");
  if (r.style === "panel") out.push("Panels sold as 6×8 carry 18 to 28 pickets of different widths and thicknesses, so compare picket count and thickness, not just price.");
  if (r.style === "vinyl") out.push("Any gate posts need an aluminum stiffener insert, which Catalyst sells separately from the posts and panels — budget for one per gate post.");
  if (r.pickets && r.style !== "picket") {
    const cedar = run({ ...v, wood: "cedar" });
    out.push(`Built in cedar instead of pressure-treated pine, the same materials run about ${fmtMoney(cedar.materialCost)} (${fmtMoney(cedar.materialCost - r.materialCost)} more).`);
  }
  if (r.pickets) out.push(`At 6-ft post spacing — stiffer in high-wind areas — the run takes ${run({ ...v, sp: 6 }).layout.posts} posts instead of ${r.layout.posts}.`);
  return out;
}

function presetAnswer(v: FenceValues): PresetAnswer {
  const r = run(v);
  const style = r.style;
  const L = r.layout.totalFt;
  const H = r.heightFt;
  const line = r.posts.find((p) => p.kind === "line");
  const pro = proRange(style);
  const withGate = run({ ...v, wg: 1, ww: 48 });
  const uShape = run({ ...v, runs: 3, r1: L / 4, r2: L / 2, r3: L / 4 });
  const bullets: string[] = [];

  if (r.pickets) {
    const raw = (L * 12) / r.pickets.pitchIn;
    bullets.push(
      style === "bob"
        ? `Board-on-board with ${fmt(v.ov, 2)}-in overlap needs ${fmt(r.pickets.perFt, 2)} boards per foot: ${fmt(L * 12)} in ÷ ${fmt(r.pickets.pitchIn, 2)} in = ${fmtInt(r.pickets.net)}, or ${fmtInt(r.pickets.withWaste)} with 10% spare — ${fmtInt(r.pickets.net - run(valuesFor("privacy", L)).pickets!.net)} more than a side-by-side privacy fence.`
        : `${fmt(v.pw, 1)}-in pickets ${v.gap ? `with ${fmt(v.gap, 2)}-in gaps` : "butted tight"}: ${fmt(L * 12)} in ÷ ${fmt(r.pickets.pitchIn, 2)} in = ${fmt(raw, 1)} → ${fmtInt(r.pickets.net)} pickets, ${fmtInt(r.pickets.withWaste)} with 10% spare for splits and knots.`,
    );
  } else {
    const centers = r.spacingFt;
    const full = Math.floor(L / centers + 1e-9);
    const cut = L - full * centers;
    bullets.push(
      `${fmtInt(r.panels)} panels (${style === "vinyl" ? `${H}-ft vinyl` : "6×8 ft wood"}) on ${formatFeetInches(centers)} post centers: ${full} full panels${cut > 0.05 ? ` and a ${formatFeetInches(cut)} last section cut from one more panel` : ""}.`,
    );
  }
  bullets.push(
    `${postsSentence(r)} (${r.layout.sections} sections). With a 4-ft gate in the run it becomes ${withGate.layout.posts} posts, 2 of them gate posts${withGate.pickets ? `, and ${fmtInt(withGate.pickets.withWaste)} pickets` : ""}; bent into a U of ${fmt(L / 4)}, ${fmt(L / 2)} and ${fmt(L / 4)} ft it takes ${uShape.layout.posts} posts.`,
  );
  if (line) {
    bullets.push(
      line.size === "vinyl"
        ? `Set each 5×5 post ${line.embedIn} in deep on 6 in of gravel (a ${line.holeDepthIn}-in hole, 10 in wide).${H === 6 ? " Catalyst's 6×8 Newbury panels use 108-in posts, which leaves 36 in below a 6-ft fence." : ""}`
        : `Buy ${line.stockFt}-ft posts: ${H === 8 ? "an" : "a"} ${H}-ft fence buries ${line.embedIn} in (a third of the post) on ${HOLE.woodGravelIn} in of gravel, so it needs ${formatFeetInches(line.minLengthFt)}${line.stockFt === 8 || H >= 8 ? "." : ` — 8-ft posts would leave only ${fmt(96 - H * 12)} in in the ground.`}`,
    );
  }
  if (r.railBoards) bullets.push(`${r.railsPerSection} rails per section → ${fmtInt(r.railBoards)} 2×4×8 rails, plus ${fmtInt(r.fasteners.picket)} 2-in and ${fmtInt(r.fasteners.rail)} 3-in galvanized screws or nails.`);
  bullets.push(
    `Concrete: ${fmtInt(r.concrete.bags)} × 50-lb Fast-Setting (${line?.bagsEach ?? 0} per post, ${fmt(r.concrete.cuyd, 2)} yd³) — ${fmtInt(r.concrete.weightLb)} lb to haul and about ${fmtInt(r.concrete.waterGal[0])} gal of water.`,
  );
  bullets.push(`Materials come to about ${fmtMoney(r.materialCost)} (${fmtMoney(r.materialCost / L)}/ft) at October 2026 prices, versus ${fmtMoney(pro.perLf[0] * L)}–${fmtMoney(pro.perLf[1] * L)} installed (${pro.source}).`);
  bullets.push(...scenarioNotes(v, r).slice(0, 2));

  const rows = (["privacy", "bob", "picket", "panel", "vinyl"] as FenceStyle[]).map((st) => {
    const x = run(valuesFor(st, L));
    return [
      `${STYLES[st].label}, ${x.heightFt} ft`,
      x.pickets ? `${fmtInt(x.pickets.withWaste)} pickets` : `${fmtInt(x.panels)} panels`,
      fmtInt(x.layout.posts),
      fmtInt(x.concrete.bags),
      fmtMoney(x.materialCost),
    ];
  });

  const annulus = Math.PI * 25 - 12.25;
  const notes = [
    r.pickets
      ? `Posts: ${L} ft ÷ 8 ft maximum spacing = ${fmt(L / 8, 2)}, rounded up to ${r.layout.sections} sections, spaced evenly at ${formatFeetInches(r.layout.runs[0]?.spacing ?? 0)}. A straight run needs one more post than it has sections: ${r.layout.sections} + 1 = ${r.layout.posts}. Every corner shares a post; every gate adds two.`
      : `Panels: ${L} ft ÷ ${formatFeetInches(r.spacingFt)} post centers = ${fmt(L / r.spacingFt, 2)}, rounded up to ${r.panels} panels. Posts = panels + 1 = ${r.layout.posts} on a straight run.`,
    line && line.size !== "vinyl"
      ? `Concrete per post: a 10-in hole has ${fmt(Math.PI * 25, 1)} sq in of area; minus the 3.5 × 3.5 in post leaves ${fmt(annulus, 1)} sq in. Concrete fills ${line.embedIn - HOLE.capIn} in (the ${line.embedIn}-in embedment minus a 3-in soil cap): ${fmt(annulus, 1)} × ${line.embedIn - HOLE.capIn} ÷ 1,728 = ${fmt(line.concreteCuftEach, 2)} cu ft ÷ 0.375 cu ft per bag = ${fmt(line.concreteCuftEach / FS.yieldCuft, 2)} → ${line.bagsEach} bags.`
      : `Concrete per post: a 10-in hole around a 5×5 vinyl post leaves ${fmt(Math.PI * 25 - 25, 1)} sq in; ${line ? line.embedIn - HOLE.capIn : 0} in of concrete = ${fmt(line?.concreteCuftEach ?? 0, 2)} cu ft → ${line?.bagsEach ?? 0} × 50-lb bags.`,
    `Prices used: ${r.materials
      .filter((m) => m.price != null)
      .map((m) => `${m.name} ${fmtMoney(m.price!, { cents: true })}${m.estimate ? " (estimate)" : ""}`)
      .join("; ")}. Tap any price in the calculator to use your store's.`,
  ];

  return {
    headline: r.pickets
      ? `A ${L} ft ${STYLES[style].label.toLowerCase()} fence ${H} ft tall takes ${fmtInt(r.pickets.withWaste)} pickets (${fmtInt(r.pickets.total)} plus 10% extra), ${fmtInt(r.layout.posts)} posts, ${fmtInt(r.railBoards)} 2×4 rails and ${fmtInt(r.concrete.bags)} bags of 50-lb Fast-Setting concrete.`
      : `A ${L} ft run of ${style === "vinyl" ? `${H}-ft vinyl` : "6×8 wood"} panels takes ${fmtInt(r.panels)} panels and ${fmtInt(r.layout.posts)} posts, set with ${fmtInt(r.concrete.bags)} bags of 50-lb Fast-Setting concrete.`,
    bullets,
    table: { caption: `${L} ft of fence in every style`, columns: ["Style", "Boards / panels", "Posts", "Concrete bags", "Materials"], rows },
    notes,
  };
}

/* ───────── long-form guide ───────── */

function Content() {
  const ex = run(valuesFor("privacy", 100));
  const exLine = ex.posts.find((p) => p.kind === "line")!;
  const widths: [string, number, number, string][] = [
    ["Privacy, 1×6 butted", 5.5, 0, "privacy"],
    ["Privacy, 1×4 butted", 3.5, 0, "privacy"],
    ["Board-on-board, 1×6, 1.5 in overlap", 5.5, -1.5, "bob"],
    ["Board-on-board, 1×6, 1 in overlap", 5.5, -1, "bob"],
    ["Spaced picket, 1×4, 2.5 in gap", 3.5, 2.5, "picket"],
    ["Spaced picket, 1×6, 2.5 in gap", 5.5, 2.5, "picket"],
  ];
  const depths = [4, 5, 6, 8].map((h) => {
    const embed = autoEmbedIn(h);
    const need = h + embed / 12;
    return { h, embed, need, stock: stockPostFt(need) };
  });
  const bagRows = [24, 30, 36, 42].map((depth) => {
    const fill = depth - HOLE.woodGravelIn - HOLE.capIn;
    const cuft = annulusCuft(10, 12.25, fill);
    return { depth, official: quikreteOfficialBags(4, depth), cuft, fs: bagsFor(cuft, FS.yieldCuft), cm: bagsFor(cuft, POST_MIXES.cm80.yieldCuft) };
  });
  return (
    <>
      <h2>How to calculate fence materials</h2>
      <p>
        Every fence comes down to <strong>sections</strong>: the spans between posts. Divide each side by the maximum post spacing — 8 ft for wood (Home Depot&apos;s install sheet),
        the panel width for panels, 10 ft for chain link — round up, and space the posts evenly. A straight run needs one more post than it has sections. Each corner shares a post
        between two sides, and each gate needs two posts of its own.
      </p>
      <p>
        <strong>Worked example — 100 ft of 6-ft wood privacy fence:</strong> 100 ÷ 8 = 12.5 → 13 sections at about 7 ft 8 in, so 14 posts. Pickets are 5-1/2 in wide, so 1,200 in
        ÷ 5.5 = 218.2 → {fmtInt(ex.pickets!.net)} pickets, {fmtInt(ex.pickets!.withWaste)} with 10% extra. Three rails per section is {fmtInt(ex.railBoards)} 2×4×8s. Each post sits{" "}
        {exLine.embedIn} in deep, so you buy {exLine.stockFt}-ft posts and {fmtInt(ex.concrete.bags)} bags of Fast-Setting concrete ({exLine.bagsEach} per post).
      </p>

      <h2>How many pickets per foot?</h2>
      <p>Use the board&apos;s actual width — a “1×6” picket is 5-1/2 in wide, a “1×4” is 3-1/2 in. Divide 12 in by the width plus the gap (or minus the overlap):</p>
      <table>
        <thead>
          <tr>
            <th>Style</th>
            <th>Per foot</th>
            <th>Per 8-ft section</th>
            <th>Per 100 ft (+10%)</th>
          </tr>
        </thead>
        <tbody>
          {widths.map(([label, w, g, st]) => {
            const pitch = w + g;
            const per100 = run({ ...valuesFor(st as FenceStyle, 100), pw: w, gap: Math.max(0, g), ov: Math.max(0, -g) });
            return (
              <tr key={label}>
                <td>{label}</td>
                <td>{fmt(12 / pitch, 2)}</td>
                <td>{fmtInt(Math.ceil(96 / pitch - 1e-9))}</td>
                <td>{fmtInt(per100.pickets!.withWaste)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p>
        Board-on-board is two staggered layers: each front board covers the gap between two back boards with 1 to 1-1/2 in of overlap per edge, so the fence stays solid after the
        wood shrinks. That takes about 38% more boards than a butted privacy fence. Home Depot&apos;s older sheet lists 19 board-on-board pickets per 8-ft section — the overlap math
        says 20 to 24, so buy by the math.
      </p>

      <h2>How deep should fence posts be?</h2>
      <p>
        Quikrete&apos;s rule is to bury a third of the post&apos;s overall length — the same as half its height above ground — and put gravel under it for drainage. Where the ground
        freezes, go below your local frost depth; it varies enormously (Minnesota requires {FROST_EXAMPLE.zoneIIIn} in in the south of the state and {FROST_EXAMPLE.zoneIIn} in in the
        north for building footings), so ask your building department. Gate posts carry the most load: set them deeper and in bigger holes.
      </p>
      <table>
        <thead>
          <tr>
            <th>Fence height</th>
            <th>Post in ground</th>
            <th>Post length needed</th>
            <th>Buy</th>
          </tr>
        </thead>
        <tbody>
          {depths.map((d) => (
            <tr key={d.h}>
              <td>{d.h} ft</td>
              <td>{d.embed} in</td>
              <td>{formatFeetInches(d.need)}</td>
              <td>{d.stock.ft} ft{d.stock.special ? " (special order)" : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        That is why 8-ft posts are a common mistake for a 6-ft fence: they leave only 2 ft in the ground. They can work in mild climates and firm soil, but the calculator shows what
        the rule calls for and lets you choose.
      </p>

      <h2>How many bags of concrete per fence post?</h2>
      <p>
        Answers online range from half a bag to four or more because they assume different holes. Quikrete&apos;s own calculator fills a round hole three times the post width to the very top
        with no gravel; real installs sit on 4–6 in of gravel and stop 3–4 in below grade so soil can cover the concrete. For a 4×4 in a 10-in hole:
      </p>
      <table>
        <thead>
          <tr>
            <th>Hole depth</th>
            <th>Quikrete calculator (4 in round post, 12 in hole, filled)</th>
            <th>Realistic concrete</th>
            <th>50-lb Fast-Setting</th>
            <th>80-lb Concrete Mix</th>
          </tr>
        </thead>
        <tbody>
          {bagRows.map((b) => (
            <tr key={b.depth}>
              <td>{b.depth} in</td>
              <td>{b.official} bags</td>
              <td>{fmt(b.cuft, 2)} cu ft</td>
              <td>{b.fs}</td>
              <td>{b.cm}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Fast-Setting is poured dry: fill to 3–4 in below grade, then add about a gallon of water per 50-lb bag. Holes deeper than 30 in go in two lifts. Posts take strain after
        4 hours, versus 24 hours for regular 80-lb Concrete Mix, which you mix first. Because dry-poured bags can&apos;t be shared between holes, count bags post by post — or use
        the <Link href="/concrete/post-hole-calculator">post hole concrete calculator</Link> for odd hole sizes.
      </p>

      <h2>Rails, fasteners, caps and gates</h2>
      <ul>
        <li>
          <strong>Rails:</strong> no more than 24 in apart — 2 for fences up to 4 ft, 3 for 5–6 ft, 4 for 7–8 ft. One 2×4×8 per rail per section.
        </li>
        <li>
          <strong>Fasteners:</strong> 2 per picket at every rail (6 per picket on three rails) with 2-in screws or nails, and 3-in fasteners for rails — hot-dip galvanized or
          stainless, as Home Depot&apos;s install sheet specifies.
        </li>
        <li>
          <strong>Clearance:</strong> keep pickets and vinyl bottom rails at least 2 in off the ground.
        </li>
        <li>
          <strong>Gates:</strong> two hinges per leaf and a latch; double drive gates add a drop rod. Leaves wider than about 5 ft sag, and vinyl gate posts need an aluminum
          stiffener that is sold separately.
        </li>
        <li>
          <strong>Panels:</strong> “6×8” wood panels hold 18 to 28 pickets depending on the product, and posts are never included. Vinyl panels set the post centers: 97 in for
          8-ft Catalyst/Veranda Premium panels on 5×5 posts.
        </li>
      </ul>

      <h2>Mistakes that cost the most</h2>
      <ul>
        <li>Counting posts as length ÷ 8 + 1 for the whole yard — it misses every corner shared between sides and the second post at every gate.</li>
        <li>Forgetting to subtract gate openings from the picket count, or forgetting the gate leaves need pickets too.</li>
        <li>Skipping the call to 811 before digging. It is free, and hitting a buried line is not.</li>
        <li>Building right on the property line. Set posts a few inches inside it and confirm the line with your plat or a survey.</li>
        <li>Staining new pressure-treated wood too soon: Thompson&apos;s says wait 30 days; Ready Seal recommends 2–3 months.</li>
      </ul>
      <p>
        Chain link instead? Use the <Link href="/fence/chain-link-fence-calculator">chain link fence calculator</Link>. Getting quotes? The{" "}
        <Link href="/fence/fence-cost-calculator">fence cost calculator</Link> compares installed prices by material. Common jobs:{" "}
        <Link href={`${BASE}/100-ft-privacy-fence`}>100 ft privacy fence</Link>, <Link href={`${BASE}/200-ft-privacy-fence`}>200 ft fence posts</Link>,{" "}
        <Link href={`${BASE}/100-ft-vinyl-fence`}>100 ft vinyl fence</Link>.
      </p>
    </>
  );
}

/* ───────── FAQ (numbers computed so they always match the calculator) ───────── */

const F100 = run(valuesFor("privacy", 100));
const F100_LINE = F100.posts.find((p) => p.kind === "line")!;
const F4 = run(valuesFor("picket", 100));
const F4_LINE = F4.posts.find((p) => p.kind === "line")!;
const BOB = run(valuesFor("bob", 100));

export const fenceCalculator: CalculatorEntry<FenceValues> = {
  meta: {
    slug: SLUG,
    category: "fence",
    name: "Fence Calculator",
    shortName: "Wood & vinyl fences",
    h1: "Fence Calculator: Pickets, Posts, Rails & Concrete",
    metaTitle: "Fence Calculator: Pickets, Posts, Rails & Concrete",
    metaDescription: `Wood privacy, picket or vinyl fence materials with corners and gates: 100 ft of 6-ft privacy takes ${F100.pickets!.withWaste} pickets, ${F100.layout.posts} posts, ${F100.concrete.bags} bags of concrete.`,
    summary:
      "Enter each side of your fence and its gates to get pickets or panels, every post by type and length, rails, concrete bags per post, a live layout sketch and a priced shopping list.",
    outputs: ["Pickets or panels", "Posts by type", "Concrete per post", "Layout sketch", "Cost & shopping list"],
    faq: [
      {
        q: "How many pickets do I need for a 100 ft privacy fence?",
        a: `${fmtInt(F100.pickets!.net)} pickets of 5-1/2-in-wide “1×6” boards butted tight (1,200 in ÷ 5.5 in), or ${fmtInt(F100.pickets!.withWaste)} with 10% extra for splits and bad knots. Board-on-board with 1.5 in of overlap takes ${fmtInt(BOB.pickets!.net)} (${fmtInt(BOB.pickets!.withWaste)} with extra).`,
      },
      {
        q: "How many posts do I need for a 100 ft fence?",
        a: `${F100.layout.posts} for a straight run at 8 ft spacing: 100 ÷ 8 rounds up to ${F100.layout.sections} sections, plus one. Each corner shares a post, and each gate adds two gate posts.`,
      },
      {
        q: "How deep should a fence post be for a 6 ft fence?",
        a: `${F100_LINE.embedIn} in — a third of the post, or half its height above ground — on ${HOLE.woodGravelIn} in of gravel, so the hole is ${F100_LINE.holeDepthIn} in deep. In cold climates go below your local frost depth, and set gate posts deeper still.`,
      },
      {
        q: "Should I use 8 ft or 10 ft posts for a 6 ft fence?",
        a: `10 ft. A 6-ft fence with ${F100_LINE.embedIn} in in the ground needs ${formatFeetInches(F100_LINE.minLengthFt)} of post, and 8-ft posts leave only 24 in buried — below the one-third rule and often above the frost line.`,
      },
      {
        q: "How many bags of concrete per fence post?",
        a: `For a 4×4 in a 10-in hole: ${F100_LINE.bagsEach} × 50-lb bags of Fast-Setting for a 6-ft fence (${F100_LINE.holeDepthIn}-in hole) or ${F4_LINE.bagsEach} for a 4-ft fence (${F4_LINE.holeDepthIn}-in hole), with gravel underneath and a 3-in soil cap on top. Quikrete's own calculator, which fills a 12-in hole to the top, gives more.`,
      },
      {
        q: "How many rails does a 6 ft fence need?",
        a: "Three per section. Rails should be no more than 24 in apart, so fences up to 4 ft need 2, 5–6 ft need 3, and 7–8 ft need 4.",
      },
      {
        q: "How many nails or screws per fence picket?",
        a: "Two at every rail — 6 per picket on a 3-rail fence — using 2-in hot-dip galvanized or stainless fasteners. Rails take three 3-in fasteners each.",
      },
      {
        q: "How much overlap for a board-on-board fence?",
        a: "1 to 1-1/2 in per edge. With 5-1/2-in boards that is 2.67 to 3 boards per foot and leaves a 2.5–3.5 in gap between back boards for the front layer to cover.",
      },
    ],
    sources: FENCE_SOURCES,
    related: ["fence/chain-link-fence-calculator", "fence/fence-cost-calculator", "concrete/post-hole-calculator", "landscaping/gravel-calculator", "paint/deck-stain-calculator"],
    updated: FENCE_CHECKED,
    keywords: ["fence calculator", "fence picket calculator", "privacy fence", "board on board", "vinyl fence", "fence posts", "how many pickets", "fence materials"],
    featured: true,
  },
  Calculator: FenceCalculator,
  Content,
  presets: FENCE_PRESETS,
  presetAnswer,
};
