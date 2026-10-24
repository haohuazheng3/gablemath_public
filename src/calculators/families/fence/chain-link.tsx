import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { formatFeetInches } from "@/lib/units";
import { CHAIN_LINK_DEFAULTS, chainLinkInputFrom, type ChainLinkValues } from "./chain-link-model";
import { bandsPerTensionBar, computeChainLink } from "./compute";
import ChainLinkCalculator from "./ChainLinkCalculator";
import { CHAIN_LINK, CHAIN_LINK_HEIGHTS, CHAIN_LINK_SOURCES, FENCE_CHECKED, POOL, installed } from "./data";
import { straightRun } from "./layout-model";

const SLUG = "chain-link-fence-calculator";
const BASE = `/fence/${SLUG}`;
const PRO = installed("chain-link");

const valuesFor = (lengthFt: number, heightFt: number): ChainLinkValues => ({ ...CHAIN_LINK_DEFAULTS, ...straightRun(lengthFt), h: heightFt });
const run = (v: ChainLinkValues) => computeChainLink(chainLinkInputFrom(v));
const hLabel = (h: number) => (h === 3.5 ? "42 in" : `${fmt(h)} ft`);
const ftIn = (inches: number) => formatFeetInches(inches / 12);
const rolls = (n: number) => `${n} roll${n === 1 ? "" : "s"}`;

/* ───────── programmatic presets ───────── */

const SPECS: { len: number; h: number; h1: string }[] = [
  { len: 50, h: 4, h1: "Chain link fence materials for 50 ft (4 ft high)" },
  { len: 100, h: 4, h1: "Chain link fence materials list for 100 ft" },
  { len: 150, h: 4, h1: "How many rolls of chain link for 150 ft?" },
  { len: 200, h: 4, h1: "200 ft chain link fence: rolls, posts and fittings" },
  { len: 300, h: 4, h1: "How many rolls of chain link for 300 ft?" },
  { len: 100, h: 6, h1: "Materials for 100 ft of 6 ft chain link fence" },
  { len: 200, h: 6, h1: "200 ft of 6 ft chain link: rolls, posts and fittings" },
];

export const CHAIN_LINK_PRESETS: Preset<ChainLinkValues>[] = SPECS.map((s) => {
  const v = valuesFor(s.len, s.h);
  const r = run(v);
  return {
    slug: `${s.len}-ft-${s.h}-ft-chain-link`,
    values: v,
    group: `${s.h}-ft chain link`,
    label: `${s.len} ft, ${s.h} ft high`,
    h1: s.h1,
    metaTitle: `${s.len} ft of ${s.h} ft Chain Link: Rolls, Posts & Fittings`,
    metaDescription: `${s.len} ft of ${s.h}-ft chain link takes ${rolls(r.rolls)} of fabric, ${r.topRailPieces} top rails, ${r.terminal.count} terminal + ${r.line.count} line posts and ${r.fittings.tensionBands} tension bands.`,
  };
});

function presetAnswer(v: ChainLinkValues): PresetAnswer {
  const r = run(v);
  const L = r.layout.totalFt;
  const H = r.heightFt;
  const f = r.fittings;
  const gate = run({ ...v, wg: 1, ww: 48 });
  const u = run({ ...v, runs: 3, r1: L / 4, r2: L / 2, r3: L / 4 });
  const spacing = r.layout.runs[0]?.spacing ?? 0;
  const bullets = [
    `Fabric: ${fmt(L)} ft ÷ 50-ft rolls = ${fmt(L / CHAIN_LINK.rollFt, 2)} → ${rolls(r.rolls)} of ${hLabel(H)} fabric${r.leftoverFt > 0 ? `, ${fmt(r.leftoverFt)} ft spare` : " with nothing to spare — if your measurement runs even a foot over, buy one more roll"}.`,
    `Posts: 2 terminal posts (2-3/8 in) at least ${ftIn(r.terminal.minLengthIn)} long and ${r.line.count} line posts (1-5/8 in) at least ${ftIn(r.line.minLengthIn)} long, ${formatFeetInches(spacing)} on center.`,
    `Top rail: ${fmt(L)} ÷ 10 = ${r.topRailPieces} pieces of 1-3/8 in × 10 ft 6 in swedged rail — each swedged end slips into the next piece.`,
    `Fittings: 2 tension bars, ${f.tensionBands} tension bands (${f.bandsPerBar} per bar for ${hLabel(H)} fabric), 2 brace bands, 2 rail end cups, ${f.carriageBolts} carriage bolts, ${f.loopCaps} loop caps, 2 dome caps and ${f.lineTies + f.railTies} ties.`,
    `Concrete: ${r.concrete.bags} × 50-lb Fast-Setting — ${r.terminal.bagsEach} per terminal post in an 8-in hole and ${r.line.bagsEach} per line post in a 6-in hole (${fmtInt(r.concrete.weightLb)} lb to haul).`,
    `Add a 48-in walk gate and you need ${gate.terminal.count + gate.gatePosts.count} terminal posts, 2 post hinges, 2 frame hinges and a fork latch, and the fabric drops to ${fmt(gate.fabricFt)} ft (${rolls(gate.rolls)}). Bent into a U, the same ${fmt(L)} ft needs ${u.fittings.tensionBars} tension bars because each corner takes two.`,
    `Fabric, framework, concrete and gravel come to about ${fmtMoney(r.materialCost)} (fabric price estimated) against ${fmtMoney(PRO.perLf[0] * L)}–${fmtMoney(PRO.perLf[1] * L)} installed (${PRO.source}).`,
  ];
  if (H === 4)
    bullets.push(`4-ft fabric meets CPSC's ${POOL.minHeightIn}-in minimum for a pool barrier, but CPSC also caps the mesh at ${POOL.chainLinkMeshIn} in square — standard residential mesh is larger, so a pool needs small-mesh fabric or slats.`);
  if (r.topRailPieces >= 20) bullets.push(`${r.topRailPieces} top rails at 10 ft 6 in each are long, awkward loads — ask about delivery or plan for a vehicle that can carry 10.5-ft lengths.`);
  if (H >= 6) bullets.push(`At ${hLabel(H)}, Homewyse's May 2026 contractor-grade price for galvanized chain link is $29.08–$44.84 per foot — ${fmtMoney(29.08 * L)}–${fmtMoney(44.84 * L)} for ${fmt(L)} ft.`);

  const rows = CHAIN_LINK_HEIGHTS.map((h) => {
    const x = run({ ...v, h });
    return [hLabel(h), fmtInt(x.rolls), fmtInt(x.fittings.tensionBands), fmtInt(x.fittings.lineTies + x.fittings.railTies), ftIn(x.line.minLengthIn), ftIn(x.terminal.minLengthIn), fmtInt(x.concrete.bags)];
  });

  return {
    headline: `${fmt(L)} ft of ${hLabel(H)} chain link takes ${rolls(r.rolls)} of fabric, ${r.topRailPieces} top rails, ${r.terminal.count} terminal and ${r.line.count} line posts, and ${r.concrete.bags} bags of concrete.`,
    bullets,
    table: {
      caption: `${fmt(L)} ft of chain link at every height`,
      columns: ["Height", "Rolls", "Tension bands", "Ties", "Line post", "Terminal post", "Concrete bags"],
      rows,
    },
    notes: [
      `Line posts: ${fmt(L)} ft ÷ 10 ft maximum = ${fmt(L / 10, 1)} → ${r.layout.sections} equal spans of ${formatFeetInches(spacing)}, which needs ${r.layout.sections - 1} line posts between the 2 terminals. Merchants Metals' "total ÷ 10, round up" shortcut counts the terminal positions too and overbuys.`,
      `Post length: terminal posts stand ${CHAIN_LINK.terminalAboveIn} in above the ${H * 12}-in fabric and go ${r.terminal.embedIn} in into the ground (a 30-in hole with 4 in of gravel): ${H * 12 + CHAIN_LINK.terminalAboveIn} + ${r.terminal.embedIn} = ${r.terminal.minLengthIn} in. Line posts stand ${CHAIN_LINK.lineBelowIn} in below the fabric top and go ${r.line.embedIn} in deep: ${r.line.minLengthIn} in.`,
      `Ties: one per 12 in of line post (${r.line.count} × ${fmt(H)} = ${f.lineTies}) plus one per 24 in of top rail (${fmt(L)} ÷ 2 = ${f.railTies}).`,
    ],
  };
}

/* ───────── long-form guide ───────── */

function Content() {
  const ex = run(valuesFor(100, 4));
  const heights = CHAIN_LINK_HEIGHTS.map((h) => ({ h, x: run(valuesFor(100, h)) }));
  return (
    <>
      <h2>How to estimate a chain link fence</h2>
      <p>
        A chain link fence is fabric stretched between <strong>terminal posts</strong> — every end, corner and gate post — with <strong>line posts</strong> and a top rail holding it
        up in between. Measure each side, subtract gate openings, and you have the fabric footage. Fabric comes in 50-ft rolls; the top rail comes in 10 ft 6 in pieces that slip
        together for about 10 ft of coverage each.
      </p>
      <p>
        <strong>Worked example — 100 ft of 4-ft fence, straight, no gate:</strong> 100 ÷ 50 = {ex.rolls} rolls. 100 ÷ 10 = {ex.topRailPieces} top rails. 100 ft ÷ 10-ft maximum
        spacing = {ex.layout.sections} spans, so {ex.line.count} line posts between {ex.terminal.count} terminals. Each end post takes one tension bar with 3 bands, so{" "}
        {ex.fittings.tensionBands} bands, {ex.fittings.braceBands} brace bands, {ex.fittings.railEndCups} rail end cups and {ex.fittings.carriageBolts} carriage bolts.
      </p>

      <h2>Posts: sizes, spacing and lengths</h2>
      <p>
        Residential line posts are 1-5/8 in outside diameter and terminal posts 2-3/8 in (Merchants Metals). Line posts go no more than 10 ft apart, and each side is divided
        evenly — a 31-ft side gets four spans of 7 ft 9 in. Terminal posts stand 2 in taller than the fabric so the rail end cup clears it; line posts stand 2 in lower so the
        loop cap and rail sit on top. Master Halco sizes holes at about 8 in × 30 in for terminals and 6 in × 18–24 in for line posts; go deeper where frost or soft soil demands it.
      </p>
      <table>
        <thead>
          <tr>
            <th>Fabric height</th>
            <th>Line post (min)</th>
            <th>Terminal post (min)</th>
            <th>Bands per tension bar</th>
          </tr>
        </thead>
        <tbody>
          {heights.map(({ h, x }) => (
            <tr key={h}>
              <td>{hLabel(h)}</td>
              <td>{ftIn(x.line.minLengthIn)}</td>
              <td>{ftIn(x.terminal.minLengthIn)}</td>
              <td>{bandsPerTensionBar(h)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Fittings per terminal post</h2>
      <p>The fittings all hang off the tension bars, and a corner post takes two of everything because fabric ends there from both directions:</p>
      <table>
        <thead>
          <tr>
            <th>Fitting</th>
            <th>End or gate post</th>
            <th>Corner post</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Tension bar</td>
            <td>1</td>
            <td>2</td>
          </tr>
          <tr>
            <td>Tension bands (4-ft fabric)</td>
            <td>{bandsPerTensionBar(4)}</td>
            <td>{2 * bandsPerTensionBar(4)}</td>
          </tr>
          <tr>
            <td>Tension bands (6-ft fabric)</td>
            <td>{bandsPerTensionBar(6)}</td>
            <td>{2 * bandsPerTensionBar(6)}</td>
          </tr>
          <tr>
            <td>Brace band + rail end cup</td>
            <td>1 each</td>
            <td>2 each</td>
          </tr>
          <tr>
            <td>Carriage bolt (5/16 × 1-1/4 in)</td>
            <td>1 per band</td>
            <td>1 per band</td>
          </tr>
          <tr>
            <td>Dome cap</td>
            <td>1</td>
            <td>1</td>
          </tr>
        </tbody>
      </table>
      <p>
        The common shortcut of “one band less than the height in feet” undercounts 3-ft and 42-in fabric: Master Halco&apos;s table calls for at least 3 bands per bar. Ties go every
        12 in on line posts and every 24 in on the top rail, and a bottom tension wire gets a hog ring about every 2 ft.
      </p>

      <h2>Gates</h2>
      <p>
        Chain-link gates are sold by the opening — the space between the inside faces of the two gate posts. Standard single gates fit 36, 39, 42 and 48 in openings, and double
        drive gates 10 or 12 ft (Master Halco). Every gate needs two terminal posts, two post hinges and two frame hinges per leaf, and a fork latch; double gates add a drop rod.
        Hang gates at least 2 in off the ground.
      </p>

      <h2>Concrete per post</h2>
      <p>
        With 4 in of gravel under the post and concrete stopping 3 in below grade, an 8 × 30 in terminal hole holds about 0.61 cu ft of concrete — {ex.terminal.bagsEach} × 50-lb
        bags of Fast-Setting — and a 6 × 24 in line-post hole about 0.26 cu ft, or {ex.line.bagsEach} bag. Master Halco&apos;s older “two 60-lb sacks per hole” fits the terminal
        holes only; line posts need less than half that.
      </p>

      <h2>Mistakes to avoid</h2>
      <ul>
        <li>Forgetting that corners take two tension bars, two sets of bands and two rail end cups.</li>
        <li>Counting line posts as total length ÷ 10 rounded up — that includes the terminal positions and overbuys posts.</li>
        <li>Running straight over a slope: where the grade changes more than 15 in per 100 ft, add a corner-post assembly.</li>
        <li>
          Assuming chain link makes a pool barrier: CPSC guidance limits the mesh to {POOL.chainLinkMeshIn} in square (or slats that close it to 1-3/4 in) and the fence to{" "}
          {POOL.minHeightIn} in tall.
        </li>
        <li>Digging before calling 811, or setting posts right on the property line instead of about 4 in inside it.</li>
      </ul>
      <p>
        Building wood or vinyl instead? Use the <Link href="/fence/fence-calculator">fence calculator</Link>. Comparing quotes? Try the{" "}
        <Link href="/fence/fence-cost-calculator">fence cost calculator</Link>. Common sizes: <Link href={`${BASE}/100-ft-4-ft-chain-link`}>100 ft, 4 ft high</Link>,{" "}
        <Link href={`${BASE}/300-ft-4-ft-chain-link`}>300 ft rolls</Link>, <Link href={`${BASE}/100-ft-6-ft-chain-link`}>6-ft fittings</Link>.
      </p>
    </>
  );
}

const C100 = run(valuesFor(100, 4));
const C300 = run(valuesFor(300, 4));

export const chainLinkCalculator: CalculatorEntry<ChainLinkValues> = {
  meta: {
    slug: SLUG,
    category: "fence",
    name: "Chain Link Fence Calculator",
    shortName: "Chain link",
    h1: "Chain Link Fence Calculator: Fabric, Posts & Fittings",
    metaTitle: "Chain Link Fence Calculator: Rolls, Posts & Fittings",
    metaDescription: `Full chain link materials list: 100 ft of 4-ft fence takes ${C100.rolls} rolls, ${C100.topRailPieces} top rails, ${C100.terminal.count} terminal + ${C100.line.count} line posts and ${C100.concrete.bags} bags of concrete.`,
    summary:
      "Enter your sides, height and gates to get fabric rolls, top rail, terminal and line posts with lengths, every tension band, brace band and tie, concrete per post and a priced list.",
    outputs: ["Fabric rolls", "Terminal & line posts", "Every fitting", "Concrete per post", "Shopping list"],
    faq: [
      {
        q: "How many rolls of chain link do I need for 300 ft?",
        a: `${C300.rolls}. Fabric comes in 50-ft rolls, so divide the fence length minus gate openings by 50 and round up (Merchants Metals). 300 ft is exactly 6 rolls; 301 ft would need 7.`,
      },
      {
        q: "How many tension bands per chain link post?",
        a: "Per tension bar: 3 for 3-ft, 42-in and 4-ft fabric, 4 for 5-ft and 5 for 6-ft. End and gate posts take one bar; corner posts take two, so double the bands there.",
      },
      {
        q: "How far apart should chain link line posts be?",
        a: "No more than 10 ft on center. Divide each side evenly — 100 ft becomes ten 10-ft spans with 9 line posts, and 31 ft becomes four spans of 7 ft 9 in.",
      },
      {
        q: "What size posts do I need for chain link?",
        a: `Residential fences use 1-5/8 in line posts and 2-3/8 in terminal posts. For 4-ft fabric, line posts need at least ${ftIn(C100.line.minLengthIn)} and terminals ${ftIn(C100.terminal.minLengthIn)}, including ${C100.line.embedIn} and ${C100.terminal.embedIn} in below ground.`,
      },
      {
        q: "How much concrete per chain link post?",
        a: `About ${C100.terminal.bagsEach} × 50-lb bags of Fast-Setting per terminal post in an 8 × 30 in hole and ${C100.line.bagsEach} per line post in a 6 × 24 in hole, with gravel underneath and a 3-in soil cap.`,
      },
      {
        q: "How many ties do I need for chain link?",
        a: `One every 12 in on each line post and one every 24 in on the top rail. 100 ft of 4-ft fence with ${C100.line.count} line posts takes ${C100.fittings.lineTies} + ${C100.fittings.railTies} = ${C100.fittings.lineTies + C100.fittings.railTies} ties.`,
      },
      {
        q: "How wide should a chain link gate opening be?",
        a: "Gates are sold by opening, measured between the inside faces of the gate posts: 36, 39, 42 or 48 in for walk gates and 10 or 12 ft for double drive gates. Each gate needs two terminal posts.",
      },
    ],
    sources: CHAIN_LINK_SOURCES,
    related: ["fence/fence-calculator", "fence/fence-cost-calculator", "concrete/post-hole-calculator", "landscaping/gravel-calculator"],
    updated: FENCE_CHECKED,
    keywords: ["chain link fence calculator", "chain link materials list", "tension bands", "top rail", "line posts", "terminal posts", "chain link rolls"],
  },
  Calculator: ChainLinkCalculator,
  Content,
  presets: CHAIN_LINK_PRESETS,
  presetAnswer,
};
