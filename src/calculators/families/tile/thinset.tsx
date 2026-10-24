import Link from "next/link";
import type { CalculatorEntry, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { thinsetBags } from "./compute";
import { CONTACT, MORTARS, TILE_CHECKED, TROWELS, tileFormat, tileSources, trowel } from "./data";
import ThinsetCalculator from "./ThinsetCalculator";
import { THINSET_PRESETS, thinsetInputFrom, type ThinsetValues } from "./thinset-model";

const SLUG = "thinset-calculator";

const NOTES: Record<string, string> = {
  "12x24": "12×24 tile is past the 15-in mark where Custom calls for an LHT-rated mortar and back-buttering, and most installers reach for a 3/4 in U-notch or a 1/2 in notch to fill the slight cup in long porcelain.",
  "12x12": "12×12 tile sets well with a 1/4 × 3/8 in square notch. On a floor that is out of flat, a deeper notch uses more mortar but saves hollow spots.",
  "3x6": "Subway tile on a backsplash only needs a 1/4 × 1/4 in square notch (or a 3/16 in V-notch for thin wall tile). One bag usually covers the whole job — buy a small bag or a pre-mixed pail if you prefer not to mix.",
};

function presetAnswer(v: ThinsetValues): PresetAnswer {
  const i = thinsetInputFrom(v);
  const r = thinsetBags(i);
  const f = tileFormat(v.size);
  const unit = r.mortar.unit === "gal" ? "pails" : "bags";
  return {
    headline: `${fmt(v.sqft)} sq ft of ${f.label} tile needs ${fmtInt(r.bags)} ${r.bags === 1 ? unit.slice(0, -1) : unit} of ${r.mortar.short} with a ${trowel(i.trowelId).label}${r.bbBags ? ", back-buttering included" : ""}.`,
    bullets: [
      `Coverage: ${r.mortar.short} is rated at ${fmt(r.cov, 0)} sq ft per ${r.mortar.size}-${r.mortar.unit} ${r.mortar.unit === "gal" ? "pail" : "bag"} with this trowel (the low end of the maker's range).`,
      `Math: ${fmt(v.sqft)} × ${fmt(1 + v.waste / 100, 2)} ÷ ${fmt(r.cov, 0)} = ${fmt(r.trowelBags, 2)} ${unit}${r.bbBags ? ` + ${fmt(r.bbBags, 2)} for a 1/32 in back-butter skim` : ""} = ${fmt(r.exact, 2)} → ${fmtInt(r.bags)}.`,
      r.cost != null ? `Cost: about ${fmtMoney(r.cost)} at ${fmtMoney(r.mortar.price!, { cents: true })} per bag.` : "",
      `Weight: ${fmtInt(r.weightLb)} lb to carry — lightweight 25–35 lb bags cover the same area as a 50-lb bag.`,
      `Contact: aim for ${CONTACT.dry}% mortar coverage on the back of each tile indoors and ${CONTACT.wet}% in showers and outdoors.`,
    ].filter(Boolean),
    table: {
      caption: `${fmt(v.sqft)} sq ft of ${f.label}: bags by trowel and brand`,
      columns: ["Trowel", "Store brand", "VersaBond", "Ultraflex LFT", "ProLite (30 lb)"],
      rows: TROWELS.map((t) => [t.label, ...["basic", "versabond", "ultraflex-lft", "prolite"].map((id) => fmtInt(thinsetBags({ ...i, mortarId: id, trowelId: t.id }).bags))]),
    },
    notes: [NOTES[v.size] ?? "", `Back-buttering is ${v.bb ? "included" : "not included"} here. Coverage charts leave it out, so large-format jobs that skip it on paper run short in practice.`].filter(Boolean),
  };
}

const ex = thinsetBags(thinsetInputFrom(THINSET_PRESETS[0].values));

function Content() {
  const brands = MORTARS.filter((m) => m.unit === "lb");
  return (
    <>
      <h2>How to calculate thinset</h2>
      <p>
        Thinset is bought by coverage, not weight. Every manufacturer publishes how many square feet one bag covers with each trowel notch.
        Divide your area by that number, add about 10% for mortar left in the bucket, and round up. If the tile is over 15 in on a side, add
        the mortar for back-buttering, which the charts leave out.
      </p>
      <p>
        <strong>Worked example — 100 sq ft of 12×24 porcelain:</strong> with a 3/4 in U-notch held at 30°, VersaBond covers {fmt(ex.cov, 0)} sq
        ft per 50-lb bag. 100 × 1.10 ÷ {fmt(ex.cov, 0)} = {fmt(ex.trowelBags, 2)} bags. A 1/32 in back-butter skim on 100 sq ft is 450 cubic
        inches of mortar, about {fmt(ex.bbBags, 2)} of a bag. Total {fmt(ex.exact, 2)}, so buy <strong>{fmtInt(ex.bags)} bags</strong>. With a 1/4 × 3/8 in notch and VersaBond LHT the same floor takes 2 bags — the trowel matters more than the brand.
      </p>

      <h2>Coverage per bag by trowel (minimum published)</h2>
      <table>
        <thead>
          <tr>
            <th>Mortar</th>
            {TROWELS.slice(1).map((t) => (
              <th key={t.id}>{t.short}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {brands.map((m) => (
            <tr key={m.id}>
              <td>
                {m.short} ({m.size} lb)
              </td>
              {TROWELS.slice(1).map((t) => (
                <td key={t.id}>{m.cov[t.id] ? `${m.cov[t.id]![0]}–${m.cov[t.id]![1]}` : "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Square feet per bag, from each maker&apos;s technical data sheet. &quot;—&quot; means the maker does not list that trowel; the calculator
        then scales the 1/4 in rate by bed depth and labels the result an estimate. The 30-, 35- and 25-lb lightweight bags cover what a
        50-lb bag does, so compare bags, not pounds.
      </p>

      <h2>Which trowel for which tile</h2>
      <ul>
        <li>Mosaics and thin wall tile: 3/16 in V-notch.</li>
        <li>Tile up to about 8 in (3×6 subway, 4×4, 6×6): 1/4 × 1/4 in square notch.</li>
        <li>Tile 8–15 in (12×12, 4×12): 1/4 × 3/8 in square notch.</li>
        <li>
          Tile over 15 in (12×24, 24×24, planks): 3/4 in U-notch held at 30° or a 1/2 in notch, with an LHT mortar and back-buttering. Custom
          and TEC no longer recommend the 1/2 × 1/2 square notch with some of their mortars.
        </li>
      </ul>
      <p>
        The notch is only a starting point. Lift a tile after setting it: you want {CONTACT.dry}% of the back covered in dry areas and {CONTACT.wet}% in
        showers and outdoors. If you see bare ridges, go up a notch.
      </p>

      <h2>LHT, LFT and lightweight mortars</h2>
      <p>
        Large and heavy tile mortars (ANSI A118.4H or A118.15H, sold as &quot;LHT&quot; and formerly &quot;LFT&quot;) can be built up to 1/2–3/4
        in without slumping, which long porcelain needs. Standard modified thinsets like MAPEI Ultraflex 2 are rated for beds up to 1/4 in and
        are not meant for tile over 15 in. Keraflex Super is sold in 44-lb bags, so it looks pricier per pound but covers more per bag.
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>Quoting the high end of a coverage range. Real floors are not flat; the calculator uses the low end.</li>
        <li>Forgetting back-buttering on large tile — about 0.4 bag per 100 sq ft.</li>
        <li>Adding too much water. Follow the bag: most 50-lb bags take about 5–6 quarts.</li>
        <li>Using a modified thinset under KERDI. Schluter calls for its own ALL-SET or an unmodified mortar.</li>
      </ul>
      <p>
        Count the tile itself with the <Link href="/tile/tile-calculator">tile calculator</Link>, then the{" "}
        <Link href="/tile/grout-calculator">grout calculator</Link>. Setting cement board first? The{" "}
        <Link href="/tile/backer-board-calculator">backer board calculator</Link> includes the thinset under the board.
      </p>
    </>
  );
}

export const thinsetCalculator: CalculatorEntry<ThinsetValues> = {
  meta: {
    slug: SLUG,
    category: "tile",
    name: "Thinset Calculator",
    shortName: "Thinset bags",
    h1: "Thinset Calculator",
    metaTitle: "Thinset Calculator: Bags by Trowel Size & Brand",
    metaDescription: "Bags of thinset by trowel size: real coverage for VersaBond, MAPEI, LATICRETE and TEC (55 sq ft per 50-lb bag at 1/4×3/8 in), plus back-buttering.",
    summary: "Enter the area and tile size to get bags of thinset for the right trowel, with back-buttering for large tile and a side-by-side of every major brand.",
    outputs: ["Bags by trowel", "Brand comparison", "Back-butter", "Cost"],
    faq: [
      { q: "How much thinset do I need for 100 sq ft of 12x24 tile?", a: `About ${fmtInt(ex.bags)} 50-lb bags of VersaBond with a 3/4 in U-notch at 30° and back-buttering (${fmt(ex.exact, 2)} bags exactly). With a 1/4 × 3/8 in notch and VersaBond LHT it is 2 bags.` },
      { q: "How many square feet does a 50 lb bag of thinset cover?", a: "It depends on the trowel. VersaBond covers 85–95 sq ft with a 1/4 × 1/4 in notch, 60–67 with 1/4 × 3/8 in and 42–47 with 1/2 in. A conservative figure for any brand at 1/4 × 3/8 in is 55 sq ft." },
      { q: "Does a 30 lb bag of ProLite cover the same as 50 lb of VersaBond?", a: "Yes, slightly more. Custom rates 30-lb ProLite at 63–70 sq ft with a 1/4 × 3/8 in notch versus 60–67 for a 50-lb bag of VersaBond." },
      { q: "What size trowel should I use for 12x24 tile?", a: "A 3/4 in U-notch held at 30° or a 1/2 in notch, plus back-buttering, is the usual choice. Check by lifting a tile: you need 80% contact indoors and 95% in showers." },
      { q: "Do I need to back butter large format tile?", a: "Yes for tile over 15 in. A 1/32 in skim coat uses about 0.4 of a 50-lb bag per 100 sq ft, and coverage charts do not include it." },
      { q: "What's the difference between LFT and LHT mortar?", a: "They are the same category under different names. LHT (large and heavy tile) is the current label for mortars rated ANSI A118.4H or A118.15H that hold beds up to 1/2–3/4 in; Custom's VersaBond-LFT was renamed VersaBond LHT." },
    ],
    sources: tileSources("versabond", "prolite", "simpleset", "customFaq", "mapeiMortar", "laticreteMortar", "tec", "mortarPrices"),
    related: ["tile/tile-calculator", "tile/grout-calculator", "tile/backer-board-calculator", "concrete/mortar-calculator"],
    updated: TILE_CHECKED,
    keywords: ["thinset calculator", "how much thinset", "mortar coverage", "trowel size", "versabond coverage", "bags of thinset"],
  },
  Calculator: ThinsetCalculator,
  Content,
  presets: THINSET_PRESETS,
  presetAnswer,
};
