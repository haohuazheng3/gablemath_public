import Link from "next/link";
import type { CalculatorEntry, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { backerPlan, describePlan, fastenersPerSheet } from "./compute";
import { BACKERS, BACKER_RULES, TILE_CHECKED, tileSources } from "./data";
import BackerBoardCalculator from "./BackerBoardCalculator";
import { BACKER_PRESETS, backerInputFrom, type BackerValues } from "./backer-model";

const SLUG = "backer-board-calculator";

function presetAnswer(v: BackerValues): PresetAnswer {
  const i = backerInputFrom(v);
  const r = backerPlan(i);
  const b = r.backer;
  const floor = i.surface === "floor";
  return {
    headline: `${fmt(v.sqft)} sq ft of ${v.surface} needs ${fmtInt(r.sheets)} sheets of ${b.short} (${b.wFt}×${b.lFt} ft), about ${fmtInt(r.fasteners)} screws${r.under ? ` and ${fmtInt(r.under.bags)} bag of thinset underneath` : ""}.`,
    bullets: [
      `Sheets: ${fmt(v.sqft)} × 1.10 ÷ ${fmt(r.sheetSqFt)} sq ft = ${fmt(r.netSheets * 1.1, 2)} → ${fmtInt(r.sheets)} sheets.`,
      `Screws: ${r.perSheet} per full sheet (${floor ? `${BACKER_RULES.cementSpacingIn} in grid over the whole board` : `every ${BACKER_RULES.cementSpacingIn} in along each stud at ${BACKER_RULES.studSpacingIn} in on center`}) → ${fmtInt(r.fasteners)} with 10% extra; buy ${describePlan(r.fastenerPlan)}.`,
      r.tapeFt ? `Seams: about ${fmtInt(r.tapeFt)} ft of 2 in alkali-resistant mesh tape, embedded in thinset — ${describePlan(r.tapePlan)}.` : "",
      r.weightLb != null ? `Weight: ${fmtInt(r.weightLb)} lb of board — ${fmt(b.weightLb!, 1)} lb per sheet.` : "",
      `Cost: about ${fmtMoney(r.cost)} for board, screws${r.tapeFt ? ", tape" : ""}${r.under ? " and thinset" : ""}.`,
    ].filter(Boolean),
    table: {
      caption: `${fmt(v.sqft)} sq ft of ${v.surface}: every board compared`,
      columns: ["Board", "Sheets", "Fasteners", "Cost"],
      rows: BACKERS.filter((x) => floor || !x.floorOnly).map((x) => {
        const p = backerPlan({ ...i, backerId: x.id });
        return [`${x.short} (${x.wFt}×${x.lFt})`, fmtInt(p.sheets), fmtInt(p.fasteners), x.price != null ? fmtMoney(p.cost) : "—"];
      }),
    },
    notes: [
      floor
        ? "On a floor, 1/4 in board is enough: it adds no strength, it just gives the tile a stable, non-wood surface. The subfloor itself must be stiff enough for tile."
        : "In a shower, cement board only holds the tile. Coat it with a liquid membrane such as RedGard (55 sq ft per gallon for two coats) or cover it with KERDI before tiling.",
    ],
  };
}

const showerSheets = backerPlan({ areaSqFt: 77, backerId: "durock-12", surface: "wall" });
const bath = backerPlan(backerInputFrom(BACKER_PRESETS[0].values));

function Content() {
  return (
    <>
      <h2>How to calculate backer board</h2>
      <p>
        Measure the area you will tile — floor length × width, or each wall&apos;s width × the height the tile reaches — and divide by the area of
        one sheet. Add 10% for cutouts and offcuts and round up. Most cement board comes in 3 × 5 ft sheets (15 sq ft) that one person can carry;
        foam boards also come in 4 × 8 ft (32 sq ft).
      </p>
      <p>
        <strong>Worked example — a 3 × 5 ft shower tiled 7 ft high:</strong> the walls are (3 + 5 + 3) × 7 = 77 sq ft. 77 × 1.10 ÷ 15 = 5.6, so
        buy <strong>{showerSheets.sheets} sheets</strong> of 1/2 in board and about {fmtInt(showerSheets.fasteners)} screws.
      </p>

      <h2>Board sizes and where they go</h2>
      <table>
        <thead>
          <tr>
            <th>Board</th>
            <th>Sheet</th>
            <th>Weight</th>
            <th>Use</th>
          </tr>
        </thead>
        <tbody>
          {BACKERS.map((b) => (
            <tr key={b.id}>
              <td>{b.short}</td>
              <td>
                {b.wFt}×{b.lFt} ft, {b.thickness}
              </td>
              <td>{b.weightLb != null ? `${b.weightLb} lb` : "light"}</td>
              <td>{b.floorOnly ? "Floors, countertops" : b.kind === "foam" ? "Walls, showers (waterproof)" : "Walls, floors"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        HardieBacker &quot;1/2 in&quot; is actually 0.42 in thick — plan trim and niche depths accordingly. Durock and HardieBacker 1/4 in boards
        are for floors and countertops only; walls need the thicker boards.
      </p>

      <h2>Cement board or foam board?</h2>
      <p>
        Cement board is cheap and stiff: a 3 × 5 sheet of 1/2 in Durock costs about $15.85 at Floor &amp; Decor but weighs 35 lb, and it needs a
        separate waterproofing layer in a shower. Foam boards such as GoBoard and wedi are far lighter and are waterproof once every seam and fastener is sealed with the maker&apos;s products — but a 3 × 5 wedi panel costs about $56.31 at Floor &amp; Decor ($67.91 list). Many
        installers use cement board on floors and dry walls, and foam board for shower walls where the membrane would otherwise be a second
        step. Whichever you pick, stay within one system for boards, fasteners and sealants.
      </p>

      <h2>How many screws per sheet</h2>
      <ul>
        <li>
          <strong>Floors:</strong> James Hardie and USG call for fasteners every {BACKER_RULES.cementSpacingIn} in over the whole sheet — about{" "}
          {fastenersPerSheet(BACKERS[0], "floor")} per 3 × 5 sheet, kept 3/8–3/4 in from the edges and 2 in from the corners.
        </li>
        <li>
          <strong>Walls:</strong> screws go into studs (16 in on center at most) every {BACKER_RULES.cementSpacingIn} in — about{" "}
          {fastenersPerSheet(BACKERS[3], "wall")} per 3 × 5 sheet hung vertically and {fastenersPerSheet(BACKERS[6], "wall")} per 4 × 8 sheet.
        </li>
        <li>
          <strong>Foam boards:</strong> GoBoard uses its own fasteners every 8 in; wedi uses one screw and washer per sq ft. Every seam and screw
          head gets the maker&apos;s sealant.
        </li>
      </ul>

      <h2>Thinset under floor board</h2>
      <p>
        Cement board on a floor is set in a bed of modified thinset with a 1/4 in square-notch trowel, then screwed down. The thinset fills voids
        so the board does not flex; it is not glue. At a conservative 75 sq ft per 50-lb bag, a 5 × 8 bathroom floor takes{" "}
        {bath.under ? fmtInt(bath.under.bags) : 1} bag. Leave a 1/8 in gap between sheets (1/4 in at the walls for Durock floors), and tape every
        seam with 2 in alkali-resistant mesh embedded in thinset.
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>Using 1/4 in board on walls — it is too flexible between studs.</li>
        <li>Skipping the thinset under floor board, which leaves hollow spots that crack tile.</li>
        <li>Lining up seams with the subfloor seams. Offset them, and stagger the board joints.</li>
        <li>Assuming cement board is waterproof. It is not; showers need a membrane over it.</li>
      </ul>
      <p>
        Next, count tile with the <Link href="/tile/tile-calculator">tile calculator</Link>, which also adds membrane for showers, and work out
        setting mortar with the <Link href="/tile/thinset-calculator">thinset calculator</Link>.
      </p>
    </>
  );
}

export const backerBoardCalculator: CalculatorEntry<BackerValues> = {
  meta: {
    slug: SLUG,
    category: "tile",
    name: "Backer Board Calculator",
    shortName: "Cement board",
    h1: "Backer Board Calculator",
    metaTitle: "Backer Board Calculator: Sheets, Screws & Tape",
    metaDescription: "Sheets of cement or foam board for floors and showers, with screws (54 per 3×5 floor sheet), mesh tape, thinset under the board and cost.",
    summary: "Enter the floor or wall area to get sheets of HardieBacker, Durock, GoBoard or wedi, the screws and tape to fasten them, and the thinset that goes under floor board.",
    outputs: ["Sheets", "Screws", "Mesh tape", "Thinset under board", "Cost"],
    faq: [
      { q: "How many sheets of cement board do I need for a shower?", a: `A 3×5 shower tiled 7 ft high has 77 sq ft of wall. With 10% extra that is ${showerSheets.sheets} sheets of 3×5 board. A 60-in tub surround tiled 6 ft up is about 60 sq ft, or 5 sheets.` },
      { q: "How many screws per sheet of HardieBacker or Durock?", a: `On floors, about ${fastenersPerSheet(BACKERS[0], "floor")} per 3×5 sheet on an 8 in grid. On walls, about ${fastenersPerSheet(BACKERS[3], "wall")} per 3×5 sheet — three studs at 16 in on center, every 8 in.` },
      { q: "Should I use 1/4 or 1/2 inch backer board?", a: "Use 1/4 in on floors and countertops, set in thinset over a solid subfloor. Walls and showers need 1/2 in board (or 0.42 in HardieBacker 500, sold as 1/2 in); Durock also makes 5/8 in." },
      { q: "How much thinset goes under cement board?", a: `About one 50-lb bag per 75 sq ft with a 1/4 in square-notch trowel. A 5×8 bathroom floor takes ${bath.under ? fmtInt(bath.under.bags) : 1} bag.` },
      { q: "How much cement board for a 5x8 bathroom floor?", a: `40 sq ft takes ${bath.sheets} sheets of 3×5 board with 10% extra, about ${fmtInt(bath.fasteners)} screws and ${bath.under ? fmtInt(bath.under.bags) : 1} bag of thinset underneath.` },
      { q: "Is cement board waterproof?", a: "No. It does not fall apart when wet, but water passes through it. In showers, cover it with a liquid membrane such as RedGard or a sheet membrane, or use a foam board system with sealed seams." },
    ],
    sources: tileSources("hardie", "durock", "goboard", "wedi", "backerPrices", "redgard"),
    related: ["tile/tile-calculator", "tile/thinset-calculator", "tile/grout-calculator"],
    updated: TILE_CHECKED,
    keywords: ["backer board calculator", "cement board", "hardiebacker", "durock", "how many sheets", "backer board screws"],
  },
  Calculator: BackerBoardCalculator,
  Content,
  presets: BACKER_PRESETS,
  presetAnswer,
};
