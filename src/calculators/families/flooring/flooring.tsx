import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { boxesFor, compareProducts, computeFlooring, inchFraction } from "./compute";
import { DEFAULT_PRODUCT, FLOORING_CHECKED, FLOORING_SOURCES, LABOR, PRODUCTS, type FloorType } from "./data";
import FlooringCalculator from "./FlooringCalculator";
import { FLOORING_DEFAULTS, flooringInputFrom, type FlooringValues } from "./flooring-model";

const SLUG = "flooring-calculator";
const BASE = `/flooring/${SLUG}`;

const NOUN: Record<FloorType, string> = { lvp: "vinyl plank", laminate: "laminate", engineered: "engineered hardwood", solid: "solid hardwood" };

const run = (v: FlooringValues) => computeFlooring(flooringInputFrom(v));
/** "an 11×12 room", "a 12×12 room" */
const article = (n: number) => (n === 8 || n === 11 || n === 18 ? "an" : "a");
const capArticle = (n: number) => (article(n) === "an" ? "An" : "A");
const productName = (id: string) => PRODUCTS.find((p) => p.id === id)!;

/* ───────────────────────── programmatic presets ───────────────────────── */

const ROOM_NOTES: Record<string, string> = {
  "10x10": "10×10 (100 sq ft) is a small bedroom, office or nursery — just large enough that the extra small-room allowance doesn't apply.",
  "10x12": "10×12 is a common secondary-bedroom size.",
  "11x12": "11×12 is a typical kid's room or home office.",
  "12x12": "12×12 (144 sq ft) is the classic bedroom used in most flooring examples.",
  "12x14": "12×14 fits a queen bed and dressers with room to walk around.",
  "12x16": "12×16 is a large bedroom or a small living room.",
  "14x16": "14×16 is a typical primary bedroom or family room.",
  "15x20": "15×20 (300 sq ft) is a living room or open den.",
  "20x20": "20×20 (400 sq ft) is a large living area or a basement rec room.",
};

const ROOM_SIZES: [number, number][] = [
  [10, 10],
  [10, 12],
  [11, 12],
  [12, 12],
  [12, 14],
  [12, 16],
  [14, 16],
  [15, 20],
  [20, 20],
];

/** `alt` = second product named in the meta description. */
const PRESET_TYPES: { type: FloorType; slug: string; group: string; alt: string }[] = [
  { type: "lvp", slug: "vinyl-plank", group: "Vinyl plank by room size", alt: "nucore-cedar-point" },
  { type: "laminate", slug: "laminate", group: "Laminate by room size", alt: "trafficmaster-grey-oak" },
];

const WHOLE_FLOOR = [500, 1000, 1500];

function roomValues(type: FloorType, a: number, b: number): FlooringValues {
  return { ...FLOORING_DEFAULTS, type, product: DEFAULT_PRODUCT[type], l1: b, w1: a, labor: LABOR[type].rate };
}

function wholeValues(sqft: number): FlooringValues {
  return { ...FLOORING_DEFAULTS, mode: "area", sqft, doors: 0 };
}

export const FLOORING_PRESETS: Preset<FlooringValues>[] = [
  ...PRESET_TYPES.flatMap(({ type, slug, group, alt: altId }) =>
    ROOM_SIZES.map(([a, b]) => {
      const v = roomValues(type, a, b);
      const r = run(v);
      const p = productName(DEFAULT_PRODUCT[type]);
      const alt = productName(altId);
      const altBoxes = boxesFor(r.orderSqft, alt.sqftPerBox);
      return {
        slug: `${a}x${b}-${slug}`,
        values: v,
        group,
        label: `${a}×${b} room, ${NOUN[type]}`,
        h1: `How many boxes of ${NOUN[type]} for ${article(a)} ${a}×${b} room?`,
        metaTitle: `${type === "lvp" ? "Vinyl Plank" : "Laminate"} for ${article(a)} ${a}x${b} Room: Boxes, Waste & Cost`,
        metaDescription: `${capArticle(a)} ${a}×${b} room is ${fmt(r.netSqft)} sq ft, ${fmt(r.orderSqft, 1)} with ${r.wastePct}% waste: ${r.boxes} boxes of ${p.brand} (${p.sqftPerBox} sq ft) or ${altBoxes} of ${alt.brand}. Cost, trim & underlayment.`,
      };
    }),
  ),
  ...WHOLE_FLOOR.map((sqft) => {
    const r = run(wholeValues(sqft));
    const nu = boxesFor(r.orderSqft, productName("nucore-cedar-point").sqftPerBox);
    return {
      slug: `${sqft}-sq-ft`,
      values: wholeValues(sqft),
      group: "Whole floors",
      label: `${fmtInt(sqft)} sq ft`,
      h1: `How much flooring do I need for ${fmtInt(sqft)} sq ft?`,
      metaTitle: `Flooring for ${fmtInt(sqft)} Sq Ft: Boxes, Waste & Cost`,
      metaDescription: `${fmtInt(sqft)} sq ft of vinyl plank is ${fmtInt(r.orderSqft)} sq ft with 10% waste — ${r.boxes} boxes of LifeProof or ${nu} of NuCore. Laminate and hardwood counts, cost installed.`,
    };
  }),
];

function roomAnswer(v: FlooringValues): PresetAnswer {
  const type = v.type as FloorType;
  const r = run(v);
  const p = flooringInputFrom(v).product;
  const a = v.w1;
  const b = v.l1;
  const rows = compareProducts(type, r.orderSqft, false);
  const diag = run({ ...v, layout: "diagonal" });
  const installed = r.materialsCost + r.laborCost;
  const halfBox = p.sqftPerBox / 2;
  const others = rows.filter((x) => x.product.id !== p.id).slice(0, 3);

  return {
    headline: `${capArticle(a)} ${a} × ${b} ft room (${fmt(r.netSqft)} sq ft) needs ${r.boxes} boxes of ${p.brand} ${NOUN[type]} — ${fmt(r.orderSqft, 1)} sq ft with the standard ${r.wastePct}% waste allowance.`,
    bullets: [
      `Math: ${fmt(r.netSqft)} sq ft × ${fmt(1 + r.wastePct / 100, 2)} = ${fmt(r.orderSqft, 1)} sq ft ÷ ${p.sqftPerBox} sq ft per box = ${fmt(r.orderSqft / p.sqftPerBox, 2)} → ${r.boxes} boxes covering ${fmt(r.coverSqft, 1)} sq ft.`,
      `Other lines need ${others.map((o) => `${o.boxes} boxes of ${o.product.short} (${o.product.sqftPerBox} sq ft)`).join(", ")} — always use the coverage printed on your carton.`,
      `Cost: about ${fmtMoney(r.boxCost)} for the flooring and ${fmtMoney(r.materialsCost)} with ${r.trim ? `${r.trim.pieces} pieces of quarter round and ` : ""}${r.transitions.pieces} transition${r.transitions.pieces === 1 ? "" : "s"} — roughly ${fmtMoney(installed)} installed at ${fmtMoney(v.labor, { cents: true })}/sq ft labor.`,
      type === "lvp"
        ? `No underlayment to buy: ${p.brand} has the pad attached. Leave a ${inchFraction(r.gapIn)} gap at the walls; no acclimation is required.`
        : `${p.short} has a pad attached, but over concrete Pergo requires 6 mil poly with 8 in overlaps. Leave a ${inchFraction(r.gapIn)} gap and acclimate 48 hours unless the cartons were stored at room conditions.`,
      ROOM_NOTES[`${a}x${b}`] ?? "",
    ].filter(Boolean),
    table: {
      caption: `Boxes of ${NOUN[type]} for ${article(a)} ${a}×${b} room by product and layout`,
      columns: ["Product", "Sq ft per box", "Straight (10%)", `Diagonal (${diag.wastePct}%)`, "Cost, straight"],
      rows: rows.map((x) => [
        x.product.short,
        fmt(x.product.sqftPerBox, 2),
        fmtInt(x.boxes),
        fmtInt(boxesFor(diag.orderSqft, x.product.sqftPerBox)),
        `${fmtMoney(x.cost)}${x.product.priced ? "" : "*"}`,
      ]),
    },
    notes: [
      `${r.boxes} boxes of ${p.short} cover ${fmt(r.coverSqft, 1)} sq ft, so ${fmt(r.leftoverSqft, 1)} sq ft is left after the ${r.wastePct}% allowance. ${
        r.leftoverSqft >= halfBox
          ? "That's half a box or more — enough to keep for repairs without buying a spare."
          : "That's less than half a box, so buy one spare box from the same dye lot if you want planks for future repairs."
      }`,
      `Laid on a 45° diagonal the order rises to ${fmt(diag.orderSqft, 1)} sq ft (${diag.wastePct}%), or ${diag.boxes} boxes — ${diag.boxes - r.boxes === 0 ? "no extra box here" : `${diag.boxes - r.boxes} more box${diag.boxes - r.boxes === 1 ? "" : "es"}`}.`,
      r.rows
        ? `With planks running along the ${b} ft wall you get about ${r.rows.count} rows across the ${a} ft width, the last one about ${fmt(r.rows.lastRowIn, 1)} in wide${
            p.plankWidthIn && r.rows.lastRowIn < p.plankWidthIn / 2 ? " — rip the first row narrower too so both edge rows match." : ", wide enough that the room needs no balancing cut."
          }`
        : "",
      rows.some((x) => !x.product.priced) ? "* No verified price for that SKU; the typical price for this flooring type is used." : "",
    ].filter(Boolean),
  };
}

function wholeAnswer(v: FlooringValues): PresetAnswer {
  const types: FloorType[] = ["lvp", "laminate", "engineered", "solid"];
  const byType = types.map((t) => {
    const tv: FlooringValues = { ...v, type: t, product: DEFAULT_PRODUCT[t], labor: LABOR[t].rate };
    return { t, r: run(tv), p: flooringInputFrom(tv).product };
  });
  const lvp = byType[0];
  const sqft = v.sqft;
  return {
    headline: `${fmtInt(sqft)} sq ft of vinyl plank takes ${lvp.r.boxes} boxes of LifeProof (20.06 sq ft each) — ${fmtInt(lvp.r.orderSqft)} sq ft with 10% waste.`,
    bullets: [
      `Same area: ${byType
        .slice(1)
        .map((x) => `${x.r.boxes} cartons of ${x.p.short} ${NOUN[x.t]} (${x.r.wastePct}% waste)`)
        .join(", ")}.`,
      `Materials run about ${fmtMoney(lvp.r.boxCost)} for LifeProof at ${fmtMoney(lvp.p.boxPrice, { cents: true })} a box; installed at ${fmtMoney(LABOR.lvp.rate, { cents: true })}/sq ft labor, about ${fmtMoney(lvp.r.boxCost + lvp.r.laborCost)}.`,
      `Removing old flooring adds roughly ${fmtMoney(sqft * 1)}–${fmtMoney(sqft * 2)} at $1–$2 per sq ft (This Old House, 2026).`,
      `A whole floor crosses doorways: plan one 94 in T-molding or reducer for every two 32–36 in openings, and quarter round along every wall where the baseboard stays.`,
      sqft >= 1000
        ? "LifeProof needs a T-molding break in any run over 100 ft and Pergo in rooms 50 ft or longer — check long hallways and open plans."
        : "At this size most layouts stay well under LifeProof's 100 ft and Pergo's 50 ft limits for unbroken runs.",
    ],
    table: {
      caption: `${fmtInt(sqft)} sq ft by flooring type`,
      columns: ["Type", "Product", "Waste", "Boxes", "Materials", "Installed"],
      rows: byType.map((x) => [
        NOUN[x.t],
        x.p.short,
        `${x.r.wastePct}%`,
        fmtInt(x.r.boxes),
        fmtMoney(x.r.materialsCost),
        fmtMoney(x.r.materialsCost + x.r.laborCost),
      ]),
    },
    notes: [
      `${fmtInt(sqft)} × 1.10 = ${fmtInt(lvp.r.orderSqft)} sq ft for vinyl or laminate; hardwood needs only ${byType[3].r.wastePct}% (Bruce's cutting and grading allowance), so ${fmtInt(byType[3].r.orderSqft)} sq ft.`,
      `Measure each room separately in the calculator above: closets and halls change the waste, and per-room measurements give the quarter round and transition counts this area-only estimate can't.`,
    ],
  };
}

function presetAnswer(v: FlooringValues): PresetAnswer {
  return v.mode === "area" ? wholeAnswer(v) : roomAnswer(v);
}

/* ───────────────────────── long-form guide ───────────────────────── */

function Content() {
  const example = run(roomValues("lvp", 12, 14));
  const cartonRows = ["lifeproof-87x48", "lifeproof-87x59", "nucore-cedar-point", "nucore-everwood-falls", "coretec-originals-7x72", "pergo-outlast-748x4724", "trafficmaster-grey-oak", "bruce-solid-325", "hdc-regal-ridge"].map(productName);
  return (
    <>
      <h2>How to calculate flooring boxes</h2>
      <p>
        Flooring is sold by the box, and boxes of the same plank size often hold different amounts. The math has four steps:
        <strong> measure the area, add waste for your layout, divide by the sq ft printed on the carton, and round up</strong> to whole boxes.
        Measure each room wall to wall, split L-shapes into rectangles, and include closets — the floor runs into them.
      </p>
      <p>
        <strong>Worked example — a 12 × 14 ft bedroom in LifeProof vinyl plank:</strong> 12 × 14 = 168 sq ft. Add 10% for a straight layout: 168 × 1.10 = 184.8
        sq ft. A LifeProof 8.7 × 47.6 in case holds 20.06 sq ft, so 184.8 ÷ 20.06 = 9.2 → <strong>{example.boxes} boxes</strong>, covering{" "}
        {fmt(example.coverSqft, 1)} sq ft. Price it as boxes × price per box, not area × price per sq ft — you pay for the whole box.
      </p>

      <h2>Square feet per box for popular lines</h2>
      <p>These are the coverages printed on the cartons (or derived from Floor &amp; Decor&apos;s box and per-sq-ft prices), checked October 2026:</p>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Sq ft per box</th>
            <th>Pad attached</th>
          </tr>
        </thead>
        <tbody>
          {cartonRows.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{fmt(p.sqftPerBox, 2)}</td>
              <td>{p.attachedPad ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Two traps: NuCore&apos;s 7 × 48 in planks come in boxes of 19.02, 23.66 or 23.76 sq ft depending on the color, and a few 12 mil LifeProof SKUs hold
        20.02 sq ft instead of 20.06. Read the number on your carton.
      </p>

      <h2>How much waste to add</h2>
      <table>
        <thead>
          <tr>
            <th>Layout</th>
            <th>Vinyl &amp; laminate</th>
            <th>Hardwood</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Straight</td>
            <td>10% (LifeProof, Floor &amp; Decor)</td>
            <td>5% (Bruce, includes grading)</td>
          </tr>
          <tr>
            <td>Diagonal 45°</td>
            <td>15% (Pergo)</td>
            <td>10% (Bruce)</td>
          </tr>
          <tr>
            <td>Herringbone / chevron</td>
            <td>15–20% (LifeProof)</td>
            <td>15–20%</td>
          </tr>
        </tbody>
      </table>
      <p>
        Small rooms waste more because every row starts and ends with an offcut — LifeProof&apos;s minimum end piece is 8 in — so the calculator adds 5% under
        100 sq ft, plus up to 5% for closets, angles and cut-outs. Glue-down hardwood runs higher, 10–15% per Bruce. Retailer pages that print &quot;add 10%&quot;
        on herringbone products are boilerplate; LifeProof says 15–20%, and only its dedicated herringbone planks may be laid that way without voiding the
        warranty.
      </p>

      <h2>Underlayment, vapor barrier and expansion gaps</h2>
      <ul>
        <li>
          <strong>Attached pad:</strong> LifeProof, NuCore, COREtec, Shaw Paragon Plus, Pergo Outlast+ and RevWood Plus come with the pad attached. Don&apos;t
          add foam: LifeProof approves only its own Universal Underlayment, COREtec allows a second layer only up to 3 mm, and Pergo only FloorMate/Gold.
        </li>
        <li>
          <strong>Concrete:</strong> Pergo requires 6 mil polyethylene with seams overlapped 8 in. LifeProof doesn&apos;t require it but recommends it on basement
          slabs prone to moisture. COREtec says never lay sheet plastic over a wood subfloor.
        </li>
        <li>
          <strong>Gaps:</strong> 1/4 in for vinyl plank (COREtec and Shaw: 1/2 in at 2,500 sq ft and up), 3/8 in for Pergo laminate, 3/4 in for solid
          hardwood, and 1/4 in (nailed) or 1/2 in (floating) for engineered. Quarter round is about 0.8 in wide, which hides a 1/4–3/8 in gap but not a 3/4 in
          one — reset the baseboards for solid hardwood.
        </li>
      </ul>

      <h2>Transitions, trim and stairs</h2>
      <p>
        Vinyl and laminate transitions come in 94 in sticks, so one T-molding or reducer covers two 32–36 in doorways; many hardwood moldings are 78 in. Pergo
        requires a T-molding in every doorway under 32 in and in rooms 50 ft or longer, and LifeProof in any run over 100 ft. For quarter round, take the wall
        length minus doorways and add 10% for miters. LifeProof planks on stairs void the warranty, which is why the calculator switches to matching stair
        treads.
      </p>

      <h2>Acclimation</h2>
      <p>
        The &quot;acclimate 48 hours&quot; rule is laminate advice. LifeProof and COREtec require no acclimation. Pergo asks for 48 hours at 60–85°F unless the
        cartons were stored at room conditions. Solid hardwood is acclimated by moisture readings — within 3% of the subfloor for strip, 2% for plank (Bruce).
      </p>

      <h2>What installation costs in 2026</h2>
      <p>
        This Old House puts vinyl plank labor at $3–$10 per sq ft and hardwood at $3–$8; published laminate figures range from $1–$2 (floating, RealCostIQ) to
        $4–$8. Tear-out adds about $1–$2 per sq ft. The calculator starts at $3.50 for vinyl and laminate and $5.50 for hardwood — change it to your quote.
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>Pricing the net area instead of whole boxes, then coming up short at checkout.</li>
        <li>Buying one box too few and getting a different dye lot later — keep leftovers or one spare box.</li>
        <li>Adding foam under a plank that already has a pad.</li>
        <li>Forgetting closets, transitions and quarter round, or butting a floating floor tight to cabinets and walls.</li>
      </ul>
      <p>
        Next steps: <Link href="/flooring/baseboard-calculator">baseboard and trim</Link>, <Link href="/flooring/carpet-calculator">carpet for the bedrooms</Link>,{" "}
        <Link href="/tile/tile-calculator">tile for the bath</Link> and <Link href="/paint/paint-calculator">paint for the walls</Link>. Quick answers for common
        sizes: <Link href={`${BASE}/12x12-vinyl-plank`}>12×12 vinyl plank</Link>, <Link href={`${BASE}/12x14-laminate`}>12×14 laminate</Link>,{" "}
        <Link href={`${BASE}/1000-sq-ft`}>1,000 sq ft</Link>.
      </p>
    </>
  );
}

export const flooringCalculator: CalculatorEntry<FlooringValues> = {
  meta: {
    slug: SLUG,
    category: "flooring",
    name: "Flooring Calculator",
    shortName: "Vinyl plank, laminate & hardwood",
    h1: "Flooring Calculator: Boxes of Vinyl Plank, Laminate or Hardwood",
    metaTitle: "Flooring Calculator: Boxes, Waste & Cost (2026)",
    metaDescription:
      "Boxes of LVP, laminate or hardwood for any room from real carton sizes (LifeProof 20.06 sq ft, Pergo 19.63) and layout waste, plus underlayment, trim, cost.",
    summary:
      "Enter your rooms and pick your product to get whole boxes with the right waste for your layout, plus underlayment, moisture barrier, transitions, quarter round and the installed cost.",
    outputs: ["Boxes by product", "Waste by layout", "Underlayment & trim", "Installed cost"],
    faq: [
      { q: "How many boxes of vinyl plank do I need for a 12x12 room?", a: "A 12×12 room is 144 sq ft, or 158.4 sq ft with 10% waste. That is 8 boxes of LifeProof (20.06 sq ft each), 7 boxes of NuCore Cedar Point (23.66 sq ft) or 9 boxes of Pergo Outlast+ laminate (19.63 sq ft)." },
      { q: "How much extra flooring should I buy for waste?", a: "10% for a straight layout of vinyl or laminate (LifeProof, Floor & Decor), 15% for diagonal (Pergo) and 15–20% for herringbone or chevron (LifeProof). Bruce hardwood needs 5% straight and 10% diagonal. Add about 5% more for rooms under 100 sq ft." },
      { q: "How many square feet are in a box of LifeProof flooring?", a: "20.06 sq ft for the 8.7 × 47.6 in planks (7 per case), 25.0 sq ft for 8.7 × 59 in, 19.0 for 7 × 48 in and 22.31 for LifeProof Herringbone. A few 12 mil SKUs hold 20.02 sq ft, so check the carton." },
      { q: "Does LifeProof flooring need underlayment?", a: "No. LifeProof has a pad attached, and the only extra underlayment LifeProof has approved is its own Universal Underlayment; anything else needs the manufacturer's OK or can affect the warranty." },
      { q: "Do I need a vapor barrier under vinyl plank or laminate on concrete?", a: "Pergo laminate requires 6 mil polyethylene over concrete with seams overlapped at least 8 in. LifeProof vinyl doesn't require it but recommends it on basement slabs prone to moisture. Don't put sheet plastic over a wood subfloor under COREtec." },
      { q: "How big should the expansion gap be?", a: "1/4 in for vinyl plank (1/2 in for COREtec and Shaw at 2,500 sq ft and up), 3/8 in for Pergo laminate, 3/4 in for solid hardwood, and 1/4 in for nailed or 1/2 in for floating engineered hardwood." },
      { q: "How much does it cost to install vinyl plank flooring in 2026?", a: "Labor runs $3–$10 per sq ft (This Old House, June 2026) and removing old flooring about $1–$2 per sq ft. A 12×12 room of LifeProof is about $480 in boxes plus roughly $504 of labor at $3.50 per sq ft." },
      { q: "Do I need to acclimate vinyl plank flooring?", a: "LifeProof and COREtec say no acclimation is required. Pergo laminate needs 48 hours at 60–85°F unless the cartons were stored at room conditions, and solid hardwood is acclimated by moisture content, not by a set number of days." },
    ],
    sources: FLOORING_SOURCES,
    related: ["flooring/baseboard-calculator", "flooring/carpet-calculator", "tile/tile-calculator", "paint/paint-calculator", "measure/square-footage-calculator", "flooring/self-leveling-concrete-calculator"],
    updated: FLOORING_CHECKED,
    keywords: ["flooring calculator", "lvp calculator", "vinyl plank", "laminate", "hardwood", "boxes of flooring", "lifeproof", "pergo", "underlayment", "how much flooring"],
    featured: true,
  },
  Calculator: FlooringCalculator,
  Content,
  presets: FLOORING_PRESETS,
  presetAnswer,
};
