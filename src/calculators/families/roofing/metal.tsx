import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { formatFeetInches } from "@/lib/units";
import { computeMetal, pitchFactor } from "./compute";
import { METAL, METAL_PROFILES, METAL_SOURCES, ROOFING_CHECKED, metalProfile } from "./data";
import MetalRoofCalculator from "./MetalRoofCalculator";
import { METAL_DEFAULTS, metalInputFrom, type MetalValues } from "./metal-model";

const SLUG = "metal-roofing-calculator";
const BASE = `/roofing/${SLUG}`;

type Spec = { a: number; b: number; oh: number; group: string; note: string };

const SPECS: Spec[] = [
  { a: 10, b: 12, oh: 6, group: "Sheds", note: "On a 10×12 shed each slope is under 6 ft, so the cheapest store option is cutting 12-ft panels in half rather than trimming 8-footers." },
  { a: 12, b: 16, oh: 6, group: "Sheds", note: "12×16 sheds and workshops often run the panels the short way, so each slope is only about 7 ft long." },
  { a: 12, b: 20, oh: 6, group: "Sheds", note: "12×20 is a common lean-to and carport size; switch the calculator to single slope if it has one." },
  { a: 24, b: 24, oh: 12, group: "Garages & barns", note: "24×24 is a common two-car garage size; at 4/12 the panels stay under 14 ft and fit stock lengths." },
  { a: 24, b: 30, oh: 12, group: "Garages & barns", note: "24×30 fits a two-car garage with a workshop bay." },
  { a: 30, b: 40, oh: 12, group: "Garages & barns", note: "30×40 is a common pole-barn and shop size; its 16' 11\" panels fall between the 16- and 20-ft stock lengths, so stock panels waste about 3 ft each." },
  { a: 30, b: 50, oh: 12, group: "Garages & barns", note: "30×50 adds a bay to the 30×40 shop — same panel length, more panels." },
  { a: 40, b: 60, oh: 12, group: "Garages & barns", note: "40×60 barns put each panel past 20 ft, so cut-to-length panels from a metal supplier are the only practical option." },
];

const valuesFor = (s: Spec): MetalValues => ({ ...METAL_DEFAULTS, l: s.b, w: s.a, eave: s.oh, rake: s.oh, stock: s.a <= 24 });

export const METAL_PRESETS: Preset<MetalValues>[] = SPECS.map((s) => {
  const r = computeMetal(metalInputFrom(valuesFor(s)));
  return {
    slug: `${s.a}x${s.b}-roof`,
    values: valuesFor(s),
    group: s.group,
    label: `${s.a}×${s.b} ft at 4/12`,
    h1: `How many metal roof panels for a ${s.a}×${s.b} roof?`,
    metaTitle: `Metal Roof Panels for a ${s.a}x${s.b} Roof: Count & Screws`,
    metaDescription: `A ${s.a}×${s.b} gable roof at 4/12 takes ${r.panels} metal panels of 36-in coverage, ${formatFeetInches(r.panelLengthFt)} long, about ${fmtInt(r.screws)} screws and ${r.ridgePieces} ridge caps.`,
  };
});

function presetAnswer(v: MetalValues): PresetAnswer {
  const r = computeMetal(metalInputFrom(v));
  const p = metalProfile(v.profile);
  const a = Math.min(v.l, v.w);
  const b = Math.max(v.l, v.w);
  const spec = SPECS.find((s) => s.a === a && s.b === b);
  const fiveV = computeMetal(metalInputFrom({ ...v, profile: "5v" }));
  const cut = computeMetal(metalInputFrom({ ...v, stock: false }));
  const stock = computeMetal(metalInputFrom({ ...v, stock: true }));
  const rows = [3, 4, 5, 6, 8].map((pitch) => {
    const x = computeMetal(metalInputFrom({ ...v, pitch }));
    return [`${pitch}/12`, formatFeetInches(x.panelLengthFt), fmtInt(x.panels), fmtInt(x.roofAreaSqFt), fmtInt(x.screws), fmtMoney(x.panelCost)];
  });
  const sp = stock.stock;
  const stockLine = !sp
    ? `Each panel is longer than the ${p.stock[p.stock.length - 1].ft}-ft stock panels stores carry, so order cut-to-length panels — about ${fmtMoney(cut.panelCost)} at $${fmt(p.perLf, 2)} per lin ft.`
    : sp.pieces === 2
      ? `From store stock, the cheapest route is ${sp.count} × ${sp.ft}-ft panels (${fmtMoney(sp.price)} each) cut in half — two ${formatFeetInches(r.panelLengthFt)} pieces per panel, factory end at the eave and the cut end under the ridge cap: ${fmtMoney(stock.panelCost)} versus about ${fmtMoney(cut.panelCost)} cut to length.`
      : `Store panels come in fixed lengths, so you'd buy ${sp.count} × ${sp.ft}-ft panels (${fmtMoney(sp.price)} each) and trim about ${Math.round(sp.offcutFt * 12)} in off each: ${fmtMoney(stock.panelCost)} versus about ${fmtMoney(cut.panelCost)} cut to length.`;
  return {
    headline: `A ${a}×${b} ft gable roof at ${v.pitch}/12 with ${v.eave}-in overhangs needs ${r.panels} panels of 36-in coverage (${r.panelsPerSide} per side), each ${formatFeetInches(r.panelLengthFt)} long, plus about ${fmtInt(r.screws)} screws.`,
    bullets: [
      `Panels per side: ${fmt(r.eaveLengthFt, 1)} ft along the eave (overhangs included) ÷ 3 ft of coverage = ${fmt(r.eaveLengthFt / 3, 2)}, rounded up to ${r.panelsPerSide}.`,
      `Panel length: ${fmt((v.w + (2 * v.eave) / 12) / 2, 2)} ft of run per side × ${fmt(pitchFactor(v.pitch), 3)} (${v.pitch}/12 multiplier) = ${formatFeetInches(r.panelLengthFt)}, to the next inch.`,
      stockLine,
      `Trim: ${r.ridgePieces} ridge caps (10½ ft, lapped to 10), ${r.eavePieces} pieces of eave trim, ${r.rakePieces} of rake trim, and ${r.eaveClosures + r.ridgeClosures} foam closure strips for the eaves and ridge.`,
      `In 5V crimp (24-in coverage) the same roof takes ${fiveV.panels} panels — ${fiveV.panels - r.panels} more to haul and screw, about ${fmtMoney(fiveV.panelCost)} in panels.`,
      `Weight: about ${fmtInt(r.weightLb)} lb of 29-ga panels — roughly ${fmt(r.weightLb / Math.max(r.squares, 0.01), 0)} lb per square, versus about 220 lb per square for architectural shingles.`,
      spec?.note ?? "",
    ].filter(Boolean),
    table: {
      caption: `The same ${a}×${b} roof at other pitches`,
      columns: ["Pitch", "Panel length", "Panels", "Roof sq ft", "Screws", "Panel cost"],
      rows,
    },
    notes: [
      `Roof area: ${fmt(r.eaveLengthFt, 1)} × ${fmt(v.w + (2 * v.eave) / 12, 1)} ft of plan × ${fmt(pitchFactor(v.pitch), 3)} = ${fmtInt(r.roofAreaSqFt)} sq ft (${fmt(r.squares, 1)} squares). At Fabral's 80 screws per square that's ${fmtInt(r.screws)} panel screws — #14 × 1 in Woodtite into a plywood or OSB deck, #10 × 1½ in into purlins — before trim and stitch screws.`,
      `Under 3/12 the IRC requires lap sealant on exposed-fastener panels; 36-in rib panels are rated down to 2½/12 by their makers and 5V crimp to 3/12. At ${v.pitch}/12 ${v.pitch >= 3 ? "either profile is fine without sealant" : "seal every side lap"}.`,
    ],
  };
}

function Content() {
  const ex = computeMetal(metalInputFrom({ ...METAL_DEFAULTS }));
  const rib = METAL_PROFILES[0];
  return (
    <>
      <h2>How to calculate metal roof panels</h2>
      <p>
        Exposed-fastener panels are ordered two ways: <strong>how many</strong> (set by the coverage width) and <strong>how long</strong> (set by
        the slope). Count panels along the eave: the building length plus both gable overhangs, divided by the panel&apos;s coverage width, rounded
        up. Length is the horizontal run from the eave edge to the ridge — half the width plus the eave overhang on a gable — times the pitch
        multiplier.
      </p>
      <p>
        <strong>Worked example — a 30 × 40 ft building, 4/12, 12-in overhangs, 36-in panels:</strong> 40 + 2 = 42 ft of eave ÷ 3 ft = 14 panels
        per side, 28 in all. The run is 15 + 1 = 16 ft × {fmt(pitchFactor(4), 4)} = {formatFeetInches(ex.panelLengthFt)}. Roof area is{" "}
        {fmtInt(ex.roofAreaSqFt)} sq ft, so {fmtInt(ex.screws)} screws at 80 per square. Full breakdown:{" "}
        <Link href={`${BASE}/30x40-roof`}>metal roof for a 30×40</Link>.
      </p>

      <h2>Coverage width is not panel width</h2>
      <p>
        Rib panels are a little wider than they cover, because the edge rib laps over the next panel. Always count with the coverage width: 36 in
        for R-panel, PBR-style and similar rib panels (Fabral Grandrib 3, Best Buy Metals Tuff-Rib, Metal Sales StrongPanel), 24 in for 5V crimp,
        and about 32 in for 7/8-in corrugated lapped two ribs on a roof.
      </p>
      <div className="overflow-x-auto">
      <table>
        <thead>
          <tr>
            <th>Profile</th>
            <th>Coverage</th>
            <th>Maker&apos;s minimum pitch</th>
            <th>Stock lengths (store)</th>
          </tr>
        </thead>
        <tbody>
          {METAL_PROFILES.map((x) => (
            <tr key={x.id}>
              <td>{x.short}</td>
              <td>{x.coverageIn} in</td>
              <td>{fmt(x.minRise, 1)}/12</td>
              <td>
                {x.stock[0].ft}–{x.stock[x.stock.length - 1].ft} ft, {fmtMoney(x.stock[0].price)}–{fmtMoney(x.stock[x.stock.length - 1].price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <h2>Cut-to-length or stock panels?</h2>
      <p>
        Metal suppliers cut panels to the inch — Best Buy Metals from 3 to 45 ft, Fabral up to 40 — so every panel fits the slope exactly. Home
        centers and lumber yards stock fixed lengths, typically 8 to 20 ft for 36-in panels and 8 to 16 ft for 5V. With stock panels you buy the
        next length up and trim the extra, which wastes metal on most roofs: at about ${fmt(rib.perLf, 2)} per linear foot for 29-gauge, a foot of
        offcut on every panel adds up. On short slopes it is often cheaper to cut one longer panel in two — the calculator checks every stock
        length and does this when it saves money. Keep the factory end at the eave and put the cut end under the ridge cap. Runs longer than the
        longest stock panel need cut-to-length panels or an end lap.
      </p>

      <h2>Screws, trim and closures</h2>
      <ul>
        <li>
          <strong>Screws:</strong> Fabral recommends 80 per square for its 36-in rib panel — at the eaves, ridge and end laps and every
          intermediate support. Use #14 × 1 in Woodtite screws into OSB or plywood, #10 × 1½ in into purlins.
        </li>
        <li>
          <strong>Ridge cap:</strong> a universal ridge cap is 10½ ft long; lapped 6 in, each piece covers 10 ft of ridge.
        </li>
        <li>
          <strong>Eave and rake trim</strong> close the panel edges along the gutters and gable ends. The calculator counts them in the same 10½-ft
          lengths — check what your supplier stocks.
        </li>
        <li>
          <strong>Foam closures</strong> seal the panel ribs: inside closures under the panels at the eave, outside closures on top of them under the
          ridge cap. They match the profile: 36-in strips for rib panels, 24-in for 5V.
        </li>
        <li>
          <strong>Underlayment:</strong> over a solid deck, a 10-square synthetic roll covers about 929 sq ft after laps. Panels screwed straight to
          purlins on a pole barn go without.
        </li>
      </ul>

      <h2>Minimum pitch</h2>
      <p>
        The IRC (R905.10.2) allows lapped, exposed-fastener metal panels at 3/12 and steeper, or down to ½/12 when every lap gets sealant. Standing
        seam can go to ¼/12. Makers rate 36-in rib panels like Grandrib 3 and Tuff-Rib from 2½/12; 5V crimp from 3/12. Below those, water backs up
        through the laps in heavy rain.
      </p>

      <h2>Weight and handling</h2>
      <p>
        29-gauge rib panels weigh about {fmt(METAL.lbPerSqFt, 2)} lb per sq ft (26-gauge about 0.85) — roughly 70 lb per square, against about 220
        lb for a square of architectural shingles. A 20-ft panel is still awkward: two people, and never in wind.
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>Counting panels by their full width instead of the coverage width — you end up a panel short on every side.</li>
        <li>Forgetting the gable overhangs in the eave length, or the eave overhang in the panel length.</li>
        <li>Measuring panel length along the wall height instead of along the slope.</li>
        <li>Skipping closures: open ribs at the eave let in wind-driven rain, birds and wasps.</li>
      </ul>
      <p>
        Shingling the house instead? The <Link href="/roofing/roofing-calculator">roofing calculator</Link> handles squares, bundles and
        accessories, and the <Link href="/roofing/roof-pitch-calculator">roof pitch calculator</Link> helps you measure the slope. Pouring the
        shop floor too? See the <Link href="/concrete/slab-calculator">concrete slab calculator</Link>.
      </p>
    </>
  );
}

export const metalCalculator: CalculatorEntry<MetalValues> = {
  meta: {
    slug: SLUG,
    category: "roofing",
    name: "Metal Roofing Calculator",
    shortName: "Metal panels",
    h1: "Metal Roofing Calculator",
    metaTitle: "Metal Roofing Calculator: Panels, Screws & Trim",
    metaDescription:
      "How many 36-in metal roof panels and how long, screws at 80 per square, ridge cap, trim and closures — with 2026 prices for R-panel and 5V crimp.",
    summary:
      "Enter the building size and pitch to get the panel count and cut length, screws, ridge cap, eave and rake trim, closures and underlayment for exposed-fastener metal roofing.",
    outputs: ["Panels & length", "Screws", "Ridge cap & trim", "Closures", "Cost"],
    faq: [
      {
        q: "How many metal roof panels do I need for a 30×40 building?",
        a: "With 36-in coverage panels and 1-ft overhangs, the 42-ft eave takes 14 panels per side — 28 in all. At a 4/12 pitch each panel is 16 ft 11 in long.",
      },
      {
        q: "How many screws do I need for a metal roof?",
        a: "Fabral recommends 80 screws per square (100 sq ft) for its 36-in rib panel, about 0.8 per sq ft. A 30×40 roof at 4/12 with 1-ft overhangs is about 1,417 sq ft, so roughly 1,134 panel screws plus trim screws.",
      },
      {
        q: "What does 36-inch coverage mean on a metal panel?",
        a: "It is the width the panel covers after its edge rib laps over the next panel. The sheet itself is a little wider, so always count panels by coverage: eave length divided by 3 ft for 36-in panels, 2 ft for 5V crimp.",
      },
      {
        q: "What is the minimum pitch for a metal roof?",
        a: "The IRC allows lapped exposed-fastener panels at 3/12, or ½/12 with sealant in every lap; standing seam goes down to ¼/12. Makers rate 36-in rib panels such as Fabral Grandrib 3 and Tuff-Rib from 2½/12, and 5V crimp from 3/12.",
      },
      {
        q: "How long should metal roof panels be?",
        a: "Measure the horizontal run from the eave edge to the ridge and multiply by the pitch multiplier. A 30-ft-wide building with 1-ft eave overhangs has a 16-ft run per side; at 4/12 (× 1.054) the panels are 16 ft 11 in.",
      },
      {
        q: "How much does a metal roof weigh?",
        a: "About 0.70 lb per sq ft for 29-gauge rib panels and 0.85 for 26-gauge — roughly 70 lb per square, versus about 220 lb per square for architectural shingles.",
      },
    ],
    sources: METAL_SOURCES,
    related: ["roofing/roofing-calculator", "roofing/roof-pitch-calculator", "concrete/slab-calculator"],
    updated: ROOFING_CHECKED,
    keywords: ["metal roofing calculator", "metal roof panels", "r panel", "5v crimp", "pole barn roof", "metal roof screws", "ridge cap", "corrugated"],
  },
  Calculator: MetalRoofCalculator,
  Content,
  presets: METAL_PRESETS,
  presetAnswer,
};
