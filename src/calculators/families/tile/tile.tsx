import Link from "next/link";
import type { CalculatorEntry, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { computeTile, describePlan, fmtJoint, pieceModuleSqFt, tileDims } from "./compute";
import { INSTALLED, PATTERNS, TILE_CHECKED, TILE_FORMATS, tileSources, trowel } from "./data";
import TileCalculator from "./TileCalculator";
import { PROJECT_SETUP, TILE_PRESETS, sizeValues, tileInputFrom, type TileValues } from "./tile-model";

const SLUG = "tile-calculator";

const NOTES: Record<string, string> = {
  "5x8-bathroom-floor": "A 5×8 bathroom is the standard American hall bath. With a tub along one 5-ft wall the tiled floor is often only about 25 sq ft — subtract the tub as an opening if yours has one.",
  "8x10-bathroom-floor": "An 8×10 bath usually holds a vanity, toilet and tub or shower. Leave the tub footprint out; tile under a freestanding vanity only if you may move it later.",
  "10x10-bathroom-floor": "12×12 ceramic is the budget choice for a 10×10 floor: small enough to follow an out-of-flat subfloor and easy to cut around a toilet flange.",
  "100-sq-ft-12x24": "12×24 porcelain is the most common floor tile today. Its long side means a deeper notch, back-buttering and a flat floor — check flatness with a straightedge before you buy.",
  "120-sq-ft-12x12": "120 sq ft is a typical kitchen or large-bath floor. 12×12 tile packs 17 to a carton here, so the last box is often only partly used — keep it as attic stock.",
  "10x12-room-12x24": "A 10×12 room in 12×24 tile looks best with the long side parallel to the longest wall and a ⅓ offset, not ½, to limit lippage.",
  "100-sq-ft-6x24-herringbone": "Herringbone with 6×24 planks wastes more than any other common layout because every perimeter piece is an angled cut — plan for 20% before attic stock.",
  "3x5-shower-walls": "A 3×5 stall has two 3-ft side walls and a 5-ft back wall. Tiled to 7 ft that is 77 sq ft; going to the ceiling adds about 11 sq ft per foot of height.",
  "5x8-shower-walls": "A 5×8 walk-in shower has 18 ft of wall. At 7 ft high that is 126 sq ft, so buying the 3.5-gal pail of membrane or a bulk carton of tile can be cheaper.",
  "tub-surround": "A standard 60 × 30 in tub alcove tiled 6 ft above the tub is about 60 sq ft: a 5-ft back wall and two 30-in end walls.",
  "kitchen-backsplash-30-sq-ft-3x6-subway": "30 sq ft is about 20 ft of counter at the usual 18 in between countertop and upper cabinets. Subtract windows, but not outlets — you cut around those.",
};

function presetAnswer(v: TileValues): PresetAnswer {
  const i = tileInputFrom(v);
  const r = computeTile(i);
  const f = r.dims.format;
  const unit = r.dims.sheet ? "sheets" : "boxes";
  const slug = TILE_PRESETS.find((p) => p.values === v)?.slug ?? TILE_PRESETS.find((p) => JSON.stringify(p.values) === JSON.stringify(v))?.slug;
  const isFloor = i.project === "floor";
  const rows = TILE_FORMATS.filter((x) => x.id !== "custom" && (!x.wallOnly || !isFloor)).map((x) => {
    const sv = sizeValues(x.id);
    const o = computeTile({ ...i, sizeId: x.id, jointIn: sv.joint, price: x.price, wastePct: null });
    return [`${x.label} ${x.sub}`, fmtInt(o.tiles.pieces), `${fmtInt(o.tiles.boxes)}${x.sheet ? " sheets" : ""}`, fmtInt(o.thinset.bags), fmtMoney(o.tileCost)];
  });
  const surf = i.surfaces.map((s) => `${fmt(s.l)} × ${fmt(s.w)}`).join(" + ");
  return {
    headline: `${fmt(r.area.net)} sq ft of ${f.label} tile takes ${fmtInt(r.tiles.pieces)} ${r.dims.sheet ? "sheets" : "tiles"} — ${fmtInt(r.tiles.boxes)} ${unit} — including ${fmt(r.waste, 0)}% for cuts, plus ${fmtInt(r.thinset.bags)} ${r.thinset.mortar.unit === "gal" ? "pail" : "bag"}${r.thinset.bags === 1 ? "" : "s"} of thinset and ${describePlan(r.grout.plan)} of grout.`,
    bullets: [
      `Area: ${surf} ft = ${fmt(r.area.net, 1)} sq ft.`,
      `Each ${f.label} tile (actual ${fmt(r.dims.longIn)} × ${fmt(r.dims.shortIn)} in) plus a ${fmtJoint(v.joint)} in joint covers ${fmt(pieceModuleSqFt(r.dims, v.joint), 3)} sq ft; ${fmt(r.area.net, 1)} × ${fmt(1 + r.waste / 100, 2)} ÷ ${fmt(pieceModuleSqFt(r.dims, v.joint), 3)} = ${fmtInt(r.tiles.pieces)} pieces → ${fmtInt(r.tiles.boxes)} ${unit} of ${r.dims.pcsPerBox}.`,
      `Thinset: ${fmtInt(r.thinset.bags)} × ${r.thinset.mortar.size}-${r.thinset.mortar.unit} ${r.thinset.mortar.short} with a ${trowel(r.trowelId).label} (${fmt(r.thinset.cov, 0)} sq ft per bag${r.backButter ? ", plus back-buttering" : ""}).`,
      `Grout: about ${fmt(r.grout.lb ?? 0, 1)} lb of ${r.grout.grout.short} for a ${fmtJoint(v.joint)} in joint ${fmt(r.dims.thickIn, 3)} in deep — ${describePlan(r.grout.plan)}.`,
      r.backer ? `Backer: ${fmtInt(r.backer.sheets)} sheets of ${r.backer.backer.short} and about ${fmtInt(r.backer.fasteners)} screws${r.backer.under ? `, set in ${fmtInt(r.backer.under.bags)} bag of thinset` : ""}.` : "",
      r.wp ? `Waterproofing: ${fmt(r.wp.need, 1)} ${r.wp.unit} of ${r.wp.name}${r.wp.id === "kerdi" ? "" : " for two coats"} — ${describePlan(r.wp.plan)}.` : "",
      `Materials come to about ${fmtMoney(r.materialCost)}; installed by a pro, about ${fmtMoney(r.installed[0])}–${fmtMoney(r.installed[1])}.`,
    ].filter(Boolean),
    table: { caption: `The same ${fmt(r.area.net)} sq ft in other tile sizes`, columns: ["Tile", "Pieces", "Boxes", "Thinset bags", "Tile cost"], rows },
    notes: [
      slug && NOTES[slug] ? NOTES[slug] : PROJECT_SETUP[i.project].note,
      `The ${fmt(r.waste, 0)}% extra is the recommendation for ${PATTERNS.find((p) => p.id === v.pattern)?.label.toLowerCase()} layout${r.dims.longIn >= 23 ? " with 24-in tile" : ""}${r.area.net < 40 ? " in a small room" : ""}. ${r.tiles.spare > 0 ? `The full ${unit} leave ${fmtInt(r.tiles.spare)} spare pieces — keep them for repairs.` : "Consider one extra box as attic stock from the same lot."}`,
    ],
  };
}

function Content() {
  const ex = computeTile(tileInputFrom(TILE_PRESETS[0].values));
  const sizes = TILE_FORMATS.filter((f) => f.id !== "custom" && f.id !== "mosaic");
  return (
    <>
      <h2>How to calculate how much tile you need</h2>
      <p>
        Tile is sold by the box, but the math starts with square feet. Measure each surface, multiply length by width (or width by tiled
        height on walls), and add the pieces together. Subtract large openings — a window, a door, a tub or a built-in vanity — but not
        outlets or switches; you cut around those and the offcuts are waste anyway.
      </p>
      <p>
        Next, work out how much floor one tile really covers. Tile sizes are nominal: a &quot;12×24&quot; porcelain tile from Floor &amp; Decor
        measures 11.70 × 23.50 in, and a Daltile &quot;12×12&quot; is 11.81 in. Add the grout joint to each side, multiply, and divide by 144.
        Divide your area by that figure, add the waste allowance, and round up to whole boxes.
      </p>
      <p>
        <strong>Worked example — a 5 × 8 ft bathroom floor in 12×24 tile:</strong> 5 × 8 = 40 sq ft. One tile with a 1/8 in joint covers
        (23.5 + 0.125) × (11.7 + 0.125) ÷ 144 = 1.94 sq ft, so the floor needs 20.6 tiles. With the {fmt(ex.waste, 0)}% recommended for 24-in
        tile that is {fmtInt(ex.tiles.pieces)} tiles. At 7 pieces per box you buy <strong>{fmtInt(ex.tiles.boxes)} boxes</strong>.
      </p>

      <h2>Tiles per square foot by size</h2>
      <table>
        <thead>
          <tr>
            <th>Tile</th>
            <th>Actual size</th>
            <th>Tiles per sq ft</th>
            <th>Pieces per box</th>
          </tr>
        </thead>
        <tbody>
          {sizes.map((f) => {
            const d = tileDims(f.id);
            return (
              <tr key={f.id}>
                <td>
                  {f.label} {f.sub}
                </td>
                <td>
                  {fmt(f.longIn)} × {fmt(f.shortIn)} in
                </td>
                <td>{fmt(1 / pieceModuleSqFt(d, f.jointIn), 2)}</td>
                <td>{f.pcsPerBox}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p>Tiles per square foot include the joint the maker suggests. Carton counts vary by brand — the same 12×24 comes 7 or 8 to a box — so enter yours under &quot;Custom&quot; if it differs.</p>

      <h2>How much extra tile to buy</h2>
      <p>
        MSI recommends 10–15% depending on the pattern, and herringbone runs 15–20%. This calculator uses 10% for a straight grid, 12% for brick
        offsets, 15% for diagonal and 20% for herringbone. Tile with a 24-in side gets at least 15% because a single bad cut wastes a lot of
        tile, and rooms under 40 sq ft get another 5% because nearly every piece is a cut. Separately, Daltile suggests keeping about 10%
        as attic stock: dye lots change, and a cracked tile years from now will not match a new box.
      </p>

      <h2>Setting materials that go with the tile</h2>
      <ul>
        <li>
          <strong>Thinset:</strong> the trowel decides the amount. A 50-lb bag of VersaBond covers 85–95 sq ft with a 1/4 × 1/4 in notch but only
          42–47 sq ft with a 1/2 in notch. Tile over 15 in also needs back-buttering. Run the numbers in the <Link href="/tile/thinset-calculator">thinset calculator</Link>.
        </li>
        <li>
          <strong>Grout:</strong> joint width, tile size and thickness all matter. A 3×6 subway tile uses about four times the grout per sq
          ft of a 12×24. Use the <Link href="/tile/grout-calculator">grout calculator</Link> to compare brands and bag sizes.
        </li>
        <li>
          <strong>Backer board:</strong> 1/4 in cement board set in thinset for floors over wood, 1/2 in board on walls. The{" "}
          <Link href="/tile/backer-board-calculator">backer board calculator</Link> counts sheets, screws and tape.
        </li>
        <li>
          <strong>Waterproofing:</strong> showers need a membrane. RedGard covers 55 sq ft per gallon as a two-coat waterproofing layer — not
          the 100 sq ft often quoted, which is its crack-prevention rate.
        </li>
      </ul>

      <h2>What tile costs to install</h2>
      <p>
        homewyse (May 2026) puts installed tile floors at ${INSTALLED.floor.range[0]}–${INSTALLED.floor.range[1]} per sq ft, wall tile at $
        {INSTALLED.walls.range[0]}–${INSTALLED.walls.range[1]} and backsplashes at ${INSTALLED.backsplash.range[0]}–$
        {INSTALLED.backsplash.range[1]}, since small jobs carry minimums. Fixr lists porcelain shower walls at ${INSTALLED.shower.range[0]}–$
        {INSTALLED.shower.range[1]}, with diagonal and herringbone layouts adding about 20% and brick offsets 10–15%.
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>Using the nominal size. A box labeled 12×24 does not cover 2 sq ft per tile.</li>
        <li>Buying exactly the room area. You will run short on cuts and have nothing left for repairs.</li>
        <li>Laying long tile in a ½ offset. ANSI A108.02 limits offsets to 33% on tile longer than 18 in because of warpage.</li>
        <li>Mixing boxes from different lots. Open several boxes and blend them as you lay.</li>
      </ul>
      <p>
        Laying a floating floor instead? Try the <Link href="/flooring/flooring-calculator">flooring calculator</Link>. Painting the rest of the
        room? The <Link href="/paint/paint-calculator">paint calculator</Link> handles walls and ceilings.
      </p>
    </>
  );
}

export const tileCalculator: CalculatorEntry<TileValues> = {
  meta: {
    slug: SLUG,
    category: "tile",
    name: "Tile Calculator",
    shortName: "Tile floors & walls",
    h1: "Tile Calculator",
    metaTitle: "Tile Calculator: Boxes, Thinset, Grout & Cost",
    metaDescription: "How many tiles and boxes you need for floors, showers and backsplashes — actual tile sizes, 10–20% pattern waste, thinset bags, grout, backer board and cost.",
    summary: "Add your floors or walls, subtract openings, and pick a tile size to get pieces and boxes plus the thinset, grout, backer board and membrane to go with them.",
    outputs: ["Tiles & boxes", "Thinset bags", "Grout", "Backer & membrane", "Cost"],
    faq: [
      { q: "How many tiles do I need for a 5x8 bathroom floor?", a: "A 5×8 floor is 40 sq ft. A 12×24 tile (actually 11.7 × 23.5 in) covers 1.94 sq ft with a 1/8 in joint, so you need 20.6 tiles; with 15% extra for 24-in tile that is 24 tiles, or 4 boxes of 7." },
      { q: "How many boxes of tile do I need?", a: "Divide the pieces you need, including waste, by the pieces per box and round up. 100 sq ft of 12×12 tile is 112 pieces with 10% extra; at 17 pieces per box that is 7 boxes." },
      { q: "How much extra tile should I buy for herringbone or diagonal?", a: "Plan on 10% for a straight grid, 12% for brick offsets, 15% for diagonal and 20% for herringbone. Tile with a 24-in side needs at least 15%, and rooms under 40 sq ft need about 5% more." },
      { q: "Should I subtract outlets from backsplash square footage?", a: "No. Subtract windows, doors and other large openings, but not outlets or switches — you cut tile around them and the offcuts are waste." },
      { q: "How much does it cost to tile a bathroom floor per square foot in 2026?", a: "About $16.38–$20.21 per sq ft installed, according to homewyse (May 2026). Diagonal and herringbone layouts add roughly 20%, and removing old tile adds $2–$5 per sq ft." },
      { q: "How much tile do I need for a 3x5 shower?", a: "Three walls (3 + 5 + 3 ft) tiled 7 ft high are 77 sq ft. In 3×6 subway tile with a ½ offset that is about 649 tiles — 9 boxes of 80 — plus two 1-gallon pails of RedGard for two coats." },
      { q: "Why is my 12x24 tile not exactly 12 by 24 inches?", a: "Tile sizes are nominal. Floor & Decor's Venato 12×24 measures 11.70 × 23.50 in, so the real size plus the grout joint is what decides how many pieces you need." },
    ],
    sources: tileSources("tileSpecs", "daltileSpecs", "tilePrices", "attic", "versabond", "customGrout", "mapeiGrout", "hardie", "redgard", "redgardPrice", "backerPrices", "homewyse", "fixr"),
    related: ["tile/thinset-calculator", "tile/grout-calculator", "tile/backer-board-calculator", "flooring/flooring-calculator", "paint/paint-calculator", "measure/square-footage-calculator", "flooring/self-leveling-concrete-calculator"],
    updated: TILE_CHECKED,
    keywords: ["tile calculator", "how many tiles", "boxes of tile", "subway tile", "shower tile", "backsplash", "12x24 tile", "floor tile"],
    featured: true,
  },
  Calculator: TileCalculator,
  Content,
  presets: TILE_PRESETS,
  presetAnswer,
};
