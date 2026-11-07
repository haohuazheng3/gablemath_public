import Link from "next/link";
import type { CalculatorEntry, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { autoGrout, describePlan, fmtJoint, groutNeed, tileDims } from "./compute";
import { JOINT_OPTIONS, TILE_CHECKED, TILE_FORMATS, tileFormat, tileSources } from "./data";
import GroutCalculator from "./GroutCalculator";
import { GROUT_PRESETS, groutInputFrom, type GroutValues } from "./grout-model";

const SLUG = "grout-calculator";

const amt = (x: ReturnType<typeof groutNeed>) => (x.lb != null ? `${fmt(x.lb, 1)} lb` : `${fmt(x.volWithExtraIn3, 0)} in³`);

function presetAnswer(v: GroutValues): PresetAnswer {
  const i = groutInputFrom(v);
  const r = groutNeed(i);
  const f = tileFormat(v.size);
  const isSubway = v.size === "3x6";
  return {
    headline: `${fmt(v.sqft)} sq ft of ${f.label} tile with a ${fmtJoint(v.joint)} in joint needs about ${amt(r)} of ${r.grout.short} — buy ${describePlan(r.plan)}.`,
    bullets: [
      `Joint volume: ${fmt(v.sqft)} × 144 × (${fmt(i.longIn)} + ${fmt(i.shortIn)} + ${fmtJoint(v.joint)}) × ${fmtJoint(v.joint)} × ${fmt(i.thickIn, 3)} ÷ ((${fmt(i.longIn)} + ${fmtJoint(v.joint)}) × (${fmt(i.shortIn)} + ${fmtJoint(v.joint)})) = ${fmt(r.volIn3, 1)} in³, plus 10% = ${fmt(r.volWithExtraIn3, 1)} in³.`,
      r.lb != null ? `Weight: ${fmt(r.volWithExtraIn3, 1)} in³ × ${r.grout.k} lb/in³ (calibrated to MAPEI's coverage table) = ${fmt(r.lb, 1)} lb.` : "",
      `One ${r.coverage[0].pack.label} covers about ${fmtInt(r.coverage[0].sqft)} sq ft of this tile.`,
      isSubway ? "A 10 mm subway tile is thick, so it takes far more grout per sq ft than the 1/4-in-thick rows printed on most grout charts." : "Long porcelain has few joints per sq ft, so a single bag goes a long way — buy the color in the smallest bag that covers the job.",
      r.plan.cost != null ? `Cost: about ${fmtMoney(r.plan.cost)}.` : "",
    ].filter(Boolean),
    table: {
      caption: `${fmt(v.sqft)} sq ft of ${f.label}: grout by joint width`,
      columns: ["Joint", "Grout", "Amount", "Buy"],
      rows: JOINT_OPTIONS.map((j) => {
        const x = groutNeed({ ...i, jointIn: j.value, groutId: autoGrout(j.value) });
        return [`${j.label} in`, x.grout.short, amt(x), describePlan(x.plan)];
      }),
    },
    notes: [
      isSubway
        ? "Ceramic subway tile has a cushioned edge and is often glazed; unsanded or fine-aggregate grout (MAPEI Ultracolor Plus FA works from 1/16 to 3/4 in) will not scratch a glossy face."
        : "Rectified porcelain can take a 1/16 in joint, but most installers use 1/8 in on 12×24 to absorb slight size and warp differences.",
      "Pre-mixed and epoxy grouts are sold by the pail or kit: compare them in the calculator above — they cost more but need no sealing.",
    ],
  };
}

const sub = groutNeed({ areaSqFt: 30, longIn: 6, shortIn: 3, thickIn: 0.394, jointIn: 0.125, groutId: "ucp-fa" });
const sub16 = groutNeed({ areaSqFt: 30, longIn: 6, shortIn: 3, thickIn: 0.394, jointIn: 0.0625, groutId: "ucp-fa" });
const big = groutNeed(groutInputFrom(GROUT_PRESETS[1].values));
const fusion = groutNeed({ ...groutInputFrom(GROUT_PRESETS[1].values), groutId: "fusion-pro" });
const penny = groutNeed({ areaSqFt: 1, longIn: 1, shortIn: 1, thickIn: 0.25, jointIn: 0.0625, groutId: "keracolor-s" });

function Content() {
  const sizes = TILE_FORMATS.filter((f) => f.id !== "custom");
  return (
    <>
      <h2>How to calculate grout</h2>
      <p>
        Grout fills the joints, so the amount depends on how much joint there is: the tile size, the joint width and the joint depth, which
        is the tile&apos;s thickness. Small or thick tile and wide joints use a lot; big thin tile with a tight joint uses very little. The
        calculator works out the joint volume per square foot with the same module formula LATICRETE and MAPEI use, adds 10%, and converts it
        to pounds or pails for the product you pick.
      </p>
      <p>
        <strong>Worked example — a 30 sq ft backsplash in 3×6 subway tile, 10 mm thick:</strong> with a 1/16 in joint the joints hold{" "}
        {fmt(sub16.volIn3, 0)} cubic inches, {fmt(sub16.volWithExtraIn3, 0)} with 10% extra. Ultracolor Plus FA weighs about 0.058 lb per
        cubic inch of joint, so you need {fmt(sub16.lb!, 1)} lb — one 10-lb bag. Open the joint to 1/8 in and it doubles to {fmt(sub.lb!, 1)} lb.
      </p>

      <h2>How far a 25-lb bag of sanded grout goes</h2>
      <table>
        <thead>
          <tr>
            <th>Tile</th>
            <th>Joint</th>
            <th>Lb per 100 sq ft</th>
            <th>Sq ft per 25 lb</th>
          </tr>
        </thead>
        <tbody>
          {sizes.map((f) => {
            const d = tileDims(f.id, undefined, 1);
            const x = groutNeed({ areaSqFt: 100, longIn: d.groutLongIn, shortIn: d.groutShortIn, thickIn: d.thickIn, jointIn: f.jointIn, groutId: "keracolor-s" });
            return (
              <tr key={f.id}>
                <td>
                  {f.label} {f.sheet ? "(1 in chips)" : f.sub}
                </td>
                <td>{fmtJoint(f.jointIn)} in</td>
                <td>{fmt(x.lb!, 1)}</td>
                <td>{fmtInt(2500 / x.lb!)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p>
        MAPEI Keracolor S at the carton&apos;s suggested joint and the tile&apos;s real thickness, including 10% extra. MAPEI&apos;s own chart
        lists 383 sq ft per 25 lb for 12×12 tile with a 1/8 in joint, before any extra.
      </p>

      <h2>Picking the joint width</h2>
      <p>
        The joint is set by the tile, not by taste. Rectified porcelain, with machine-cut square edges, can go as tight as 1/16 in. Most
        ceramic and porcelain tile uses 1/8 in — the joint Floor &amp; Decor suggests for its 3×6 subway tile. Pressed-edge
        tile with rounded, slightly uneven edges needs about 3/16 in, and rustic or handmade-look tile 1/4 in. Grout use scales almost directly
        with the joint: going from 1/16 to 1/8 in roughly doubles it, which is why the table in the calculator shows every common width.
        Measure the joint you will actually leave with your spacers, and check the grout&apos;s rated range before you buy.
      </p>

      <h2>Sanded, unsanded, pre-mixed or epoxy?</h2>
      <ul>
        <li>
          <strong>Unsanded</strong> is for joints up to 1/8 in, mostly wall tile. It shrinks and cracks in wider joints.
        </li>
        <li>
          <strong>Sanded</strong> is for 1/8 in and wider — floors and most porcelain. Fine-aggregate grouts like Ultracolor Plus FA cover both
          ranges and are safe on glossy or soft tile.
        </li>
        <li>
          <strong>Pre-mixed</strong> (Fusion Pro, Flexcolor CQ, LATICRETE RTU) comes in pails of about 220–231 cubic inches of joint per
          gallon and never needs sealing. One gallon of Fusion Pro covers about {fmtInt(fusion.coverage[0].sqft)} sq ft of 12×24 tile at a 1/8 in joint.
        </li>
        <li>
          <strong>Epoxy</strong> (Kerapoxy CQ, SPECTRALOCK PRO) is the most stain-proof choice for showers and kitchens. Check the joint limit —
          Kerapoxy CQ is rated only for 1/16–3/8 in joints.
        </li>
      </ul>

      <h2>Common mistakes</h2>
      <ul>
        <li>Ignoring tile thickness. A 10 mm subway tile needs about 57% more grout than the 1/4 in tile in most published charts.</li>
        <li>Underestimating mosaics. Penny and 1-in mosaics take about {fmt(penny.lb! * 100, 0)} lb of sanded grout per 100 sq ft, many times what large tile uses.</li>
        <li>Buying by weight across brands. A 17-lb box of Prism covers what a 25-lb bag of standard grout does.</li>
        <li>Throwing out the leftovers. Keep a little powder from the same batch so repairs match.</li>
      </ul>
      <p>
        100 sq ft of 12×24 at 1/8 in takes only about {fmt(big.lb!, 1)} lb, so for large tile a small bag or a quart of pre-mixed grout is
        often enough. Count tiles and boxes with the <Link href="/tile/tile-calculator">tile calculator</Link> and setting mortar with the{" "}
        <Link href="/tile/thinset-calculator">thinset calculator</Link>.
      </p>
    </>
  );
}

const g12 = groutNeed({ areaSqFt: 100, longIn: 23.5, shortIn: 11.7, thickIn: tileFormat("12x24").thickIn, jointIn: 0.125, groutId: "keracolor-s" });

export const groutCalculator: CalculatorEntry<GroutValues> = {
  meta: {
    slug: SLUG,
    category: "tile",
    name: "Grout Calculator",
    shortName: "Grout",
    h1: "Grout Calculator",
    metaTitle: "Grout Calculator: Pounds, Bags & Pails by Joint Size",
    metaDescription: "Grout by tile size, joint width and thickness: a 25-lb bag of sanded grout covers about 480 sq ft of 12×24 but only about 115 sq ft of 3×6 subway.",
    summary: "Enter the area, tile size and joint width to get pounds of grout and the bags or pails to buy, with every major sanded, unsanded, pre-mixed and epoxy grout compared.",
    outputs: ["Pounds of grout", "Bags or pails", "Brand comparison", "Cost"],
    faq: [
      { q: "How much grout do I need for a 3x6 subway tile backsplash?", a: `For 30 sq ft of 10 mm subway tile, about ${fmt(sub.lb!, 1)} lb of sanded or fine-aggregate grout with a 1/8 in joint, or ${fmt(sub16.lb!, 1)} lb with a 1/16 in joint — one 10-lb bag either way.` },
      { q: "How much grout for a 12x24 tile floor with a 1/8 joint?", a: `About ${fmt(g12.lb!, 1)} lb per 100 sq ft of 9 mm porcelain, so one 25-lb bag of sanded grout covers roughly ${fmtInt(2500 / g12.lb!)} sq ft.` },
      { q: "Sanded or unsanded grout for a 1/8 inch joint?", a: "1/8 in is the crossover. Unsanded grouts are rated up to 1/8 in and suit glossy wall tile; sanded grouts start at 1/8 in and are standard on floors. Fine-aggregate grouts such as Ultracolor Plus FA cover 1/16 to 3/4 in." },
      { q: "How many square feet does a 25 lb bag of sanded grout cover?", a: "MAPEI rates Keracolor S at 383 sq ft for 12×12 tile with a 1/8 in joint and Custom rates Polyblend Plus at 348. With 3×6 subway tile the same bag covers only about 115 sq ft." },
      { q: "How much does a gallon of Fusion Pro or pre-mixed grout cover?", a: `Custom's gallon fills about 220 cubic inches of joint — roughly ${fmtInt(fusion.coverage[0].sqft)} sq ft of 12×24 tile with a 1/8 in joint, far less on small tile.` },
      { q: "How much grout for penny tile?", a: `1-in mosaics with a 1/16 in joint take about ${fmt(penny.lb! * 100, 0)} lb of sanded grout per 100 sq ft, so a 25-lb bag covers about ${fmtInt(25 / penny.lb!)} sq ft.` },
    ],
    sources: tileSources("customGrout", "mapeiGrout", "laticreteGrout", "flexcolor", "groutPrices", "tileSpecs"),
    related: ["tile/tile-calculator", "tile/thinset-calculator", "tile/backer-board-calculator"],
    updated: TILE_CHECKED,
    keywords: ["grout calculator", "how much grout", "sanded grout coverage", "unsanded grout", "grout for subway tile", "premixed grout coverage"],
  },
  Calculator: GroutCalculator,
  Content,
  presets: GROUT_PRESETS,
  presetAnswer,
};
