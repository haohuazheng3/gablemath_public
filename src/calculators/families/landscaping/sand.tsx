import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { computeSand, coveragePerTon, type SandResult } from "./compute";
import { LANDSCAPING_CHECKED, SAND_BAGS, SAND_TONS_PER_YD, SAND_TYPES, SOURCES, TRUCK } from "./data";
import SandCalculator from "./SandCalculator";
import { SAND_DEFAULTS, sandInputFrom, sandPatch, type SandValues } from "./sand-model";

const SLUG = "sand-calculator";

const run = (v: SandValues): SandResult => computeSand(sandInputFrom(v));
const bagsOf = (r: SandResult, id: string) => r.bagsByOption.find((b) => b.id === id)?.bags ?? 0;
const perTon = (lb: number) => Math.ceil(2000 / lb);

/* ───────── programmatic presets ───────── */

const YARD: SandValues = { ...SAND_DEFAULTS, ...sandPatch("allpurpose"), use: "slab", shape: "vol", vol: 1, vu: "yd" };
const TON: SandValues = { ...YARD, vu: "ton" };

export const SAND_PRESETS: Preset<SandValues>[] = [
  {
    slug: "cubic-yard-of-sand",
    values: YARD,
    group: "Sand by the yard and ton",
    label: "1 cubic yard of sand",
    h1: "How many 50 lb bags of sand are in a cubic yard?",
    metaTitle: "Bags of Sand in a Cubic Yard (and What It Weighs)",
    metaDescription: `A cubic yard of sand is 54 bags of 50 lb (0.5 cu ft), 45 of 60 lb or 39 of 70 lb, and weighs about ${fmt(SAND_TONS_PER_YD)} tons loose. Cost, coverage and truck loads.`,
  },
  {
    slug: "ton-of-sand",
    values: TON,
    group: "Sand by the yard and ton",
    label: "1 ton of sand",
    h1: "How many bags of sand are in a ton, and how many yards?",
    metaTitle: "How Many Bags of Sand in a Ton? (Yards & Coverage)",
    metaDescription: `A ton of sand is about ${fmt(1 / SAND_TONS_PER_YD, 2)} cu yd — 40 bags of 50 lb, 34 of 60 lb or 29 of 70 lb. Coverage per ton at 1, 2 and 4 inches.`,
  },
];

function yardAnswer(v: SandValues): PresetAnswer {
  const r = run(v);
  const bulkPerYd = 68.95;
  return {
    headline: `A cubic yard of sand weighs about ${fmt(SAND_TONS_PER_YD)} tons (${fmtInt(SAND_TONS_PER_YD * 2000)} lb) loose and damp — that is ${fmtInt(bagsOf(r, "50"))} bags of 50 lb (0.5 cu ft), ${fmtInt(bagsOf(r, "60"))} of 60 lb or ${fmtInt(bagsOf(r, "70"))} of 70 lb.`,
    bullets: [
      "Published weights for bulk sand: Vulcan 1.35–1.49, Martin Marietta 1.44–1.47 and Kokosing 1.5 tons per cubic yard; a scale-weighed yard of mason sand at Mulch Pros is 2,600 lb (1.3 t).",
      "Bagged sand holds about 1 cu ft per 100 lb — Sakrete's data sheet gives 0.6 cu ft for a 60 lb bag — so 27 cu ft is 54 half-cubic-foot bags.",
      `One yard covers 324 sq ft at 1 in (a paver bed), 162 sq ft at 2 in or 81 sq ft at 4 in.`,
      `Cost: ${fmtInt(r.bags)} bags at $4.95 is about ${fmtMoney(r.bags * 4.95)}, against $${fmt(bulkPerYd, 2)} for a yard of bulk concrete sand (Roseville) or $69.95 a ton for mason sand (Mulch Pros) — plus delivery.`,
      `Hauling: ${fmtInt(r.pickupTrips)} trips in a half-ton pickup (1,000 lb payload) per yard; a single-axle dump truck carries about ${fmt(TRUCK.singleAxleTons / SAND_TONS_PER_YD, 1)} yd.`,
    ],
    table: {
      caption: "Sand bags per cubic yard and per ton",
      columns: ["Bag", "Yield", "Bags per cu yd", "Bags per ton", "Weight of a yard of bags"],
      rows: SAND_BAGS.filter((b) => b.id !== "c05").map((b) => [b.label, `${fmt(b.cuft)} cu ft`, fmtInt(bagsOf(r, b.id)), fmtInt(perTon(b.lb)), `${fmtInt(bagsOf(r, b.id) * b.lb)} lb`]),
    },
    notes: [
      `A cubic yard is 27 cubic feet. Divide by the bag yield (0.5, 0.6 or 0.7 cu ft) and round up for bags; multiply by the weight per yard for tons. Bags are counted by volume here — 54 bags of 50 lb is 2,700 lb, close to the 2,800 lb a damp bulk yard weighs.`,
      `Moisture moves the weight, not the volume: a yard of wet sand from an uncovered pile can weigh noticeably more than the same yard dry, which matters for a pickup's payload but not for how much you spread.`,
    ],
  };
}

function tonAnswer(v: SandValues): PresetAnswer {
  const r = run(v);
  return {
    headline: `A ton of sand is about ${fmt(r.q.cuydOrder, 2)} cubic yards (${fmt(r.q.cuftOrder, 1)} cu ft) — 40 bags of 50 lb, ${perTon(60)} of 60 lb or ${perTon(70)} of 70 lb.`,
    bullets: [
      `By weight: 2,000 lb ÷ 50 lb = 40 bags. By volume the same ton fills ${fmtInt(r.bags)} half-cubic-foot bags, because bagged sand is packed a little lighter than a damp bulk yard (${fmt(SAND_TONS_PER_YD)} t).`,
      `One ton covers about ${fmtInt(coveragePerTon(1, SAND_TONS_PER_YD))} sq ft at 1 in, ${fmtInt(coveragePerTon(2, SAND_TONS_PER_YD))} at 2 in or ${fmtInt(coveragePerTon(4, SAND_TONS_PER_YD))} at 4 in.`,
      `Price check: mason sand at $69.95 a ton (Mulch Pros) is about ${fmtMoney(69.95 * SAND_TONS_PER_YD)} a yard; 40 bags at $4.95 cost about ${fmtMoney(40 * 4.95)}.`,
      `A ton is twice the nominal payload of a half-ton pickup — plan on ${fmtInt(r.pickupTrips)} trips.`,
    ],
    table: {
      caption: "What one ton of sand covers",
      columns: ["Depth", "Sq ft per ton", "Tons per 100 sq ft", "50 lb bags per 100 sq ft"],
      rows: [1, 2, 3, 4, 6].map((d) => [`${d} in`, fmtInt(coveragePerTon(d, SAND_TONS_PER_YD)), fmt((100 * d * SAND_TONS_PER_YD) / 324, 2), fmtInt(Math.ceil((100 * d) / 12 / 0.5))]),
    },
    notes: [
      `1 ton ÷ ${fmt(SAND_TONS_PER_YD)} t per yd³ = ${fmt(r.q.cuydOrder, 3)} yd³ × 27 = ${fmt(r.q.cuftOrder, 1)} cu ft. Spread 1 in deep (1/12 ft), that is ${fmtInt(r.q.cuftOrder * 12)} sq ft.`,
    ],
  };
}

function presetAnswer(v: SandValues): PresetAnswer {
  return v.shape === "vol" && v.vu === "ton" ? tonAnswer(v) : yardAnswer(v);
}

/* ───────── long-form guide ───────── */

function Content() {
  const paverBed = run({ ...SAND_DEFAULTS, ...sandPatch("leveling"), l1: 10, w1: 10, d: 1, bag: "c05", extra: 0 });
  const box = run({ ...SAND_DEFAULTS, l1: 5, w1: 5, d: 6, extra: 0 });
  const box10 = run({ ...SAND_DEFAULTS, l1: 5, w1: 5, d: 6 });
  return (
    <>
      <h2>How to calculate sand</h2>
      <p>
        Length × width × depth gives the volume: multiply square feet by the depth in inches and divide by 12 for cubic feet, then by 27 for cubic
        yards. Bags are sold by weight (50, 60, 70 lb) or by volume (0.5 cu ft); bagged sand runs about 100 lb per cubic foot, so a 50 lb bag is
        about half a cubic foot. Bulk sand is sold by the ton or the yard at roughly {fmt(SAND_TONS_PER_YD)} tons per yard.
      </p>
      <p>
        <strong>Worked examples:</strong> a 10×10 ft paver bed 1 in deep is 100 ÷ 12 = {fmt(paverBed.q.cuftOrder, 2)} cu ft —{" "}
        {fmtInt(paverBed.bags)} bags of 0.5 cu ft. A 5×5 ft sandbox filled 6 in deep is {fmt(box.q.cuftOrder, 1)} cu ft — {fmtInt(box.bags)} bags of 50 lb,
        or {fmtInt(box10.bags)} with 10% extra for spillage.
      </p>

      <h2>What a yard of sand weighs</h2>
      <table>
        <thead>
          <tr>
            <th>Source</th>
            <th>Tons per cubic yard</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Vulcan Materials (by geology)</td>
            <td>1.35–1.49</td>
          </tr>
          <tr>
            <td>Martin Marietta (fine aggregate)</td>
            <td>1.44–1.47</td>
          </tr>
          <tr>
            <td>Kokosing (Ohio, all sands)</td>
            <td>1.5</td>
          </tr>
          <tr>
            <td>Mulch Pros scale — mason & river sand</td>
            <td>1.3</td>
          </tr>
          <tr>
            <td>MI LTAP highway tables — loose sand</td>
            <td>1.32–1.48</td>
          </tr>
        </tbody>
      </table>
      <p>
        The calculator uses {fmt(SAND_TONS_PER_YD)} tons for damp, loose sand. Wet sand weighs more and dry sand less; the volume you need doesn&apos;t
        change. See <Link href={`/landscaping/${SLUG}/cubic-yard-of-sand`}>bags in a cubic yard</Link> and{" "}
        <Link href={`/landscaping/${SLUG}/ton-of-sand`}>bags in a ton</Link>.
      </p>

      <h2>Which sand?</h2>
      <ul>
        {SAND_TYPES.map((s) => (
          <li key={s.id}>
            <strong>{s.name}:</strong> {s.note}
          </li>
        ))}
      </ul>

      <h2>How deep?</h2>
      <ul>
        <li>
          <strong>Under pavers:</strong> a 1 in screeded bed (Unilock); Quikrete allows 1–2 in. Thicker beds let pavers settle unevenly.
        </li>
        <li>
          <strong>Under a slab:</strong> the IRC allows a 4 in base of clean graded sand, gravel or crushed stone.
        </li>
        <li>
          <strong>Playgrounds:</strong> CPSC rates 9 in of sand for falls up to only 4 ft — start at 12 in, since loose fill compresses at least 25%.
        </li>
        <li>
          <strong>Sandboxes:</strong> pick the depth you want to dig in; the calculator converts it to bags.
        </li>
      </ul>

      <h2>Bags or bulk?</h2>
      <p>
        Bagged play and all-purpose sand costs about $4.67–$6.20 per 50 lb bag — roughly $250–$335 per cubic yard. Bulk concrete sand is $68.95 a
        yard in Sacramento (Roseville Rock Supply) and mason sand $69.95 a ton in north Atlanta (Mulch Pros), plus delivery. For a sandbox or a paver
        bed, bags are simpler; past a yard or so, bulk wins even with a delivery fee. A pallet of Quikrete sand is 56 bags of 50 lb — 28 cu ft, about one
        cubic yard and 1.4 tons.
      </p>

      <h2>Getting it home</h2>
      <p>
        A cubic yard of damp sand weighs about 2,800 lb, nearly three times the nominal payload of a half-ton pickup — check the Tire &amp; Loading
        sticker on the door jamb before loading bags or bulk. Fifty-four 50 lb bags is 2,700 lb, so even a bagged yard is two or three trips. For
        bulk, a single-axle dump truck carries about {fmt(TRUCK.singleAxleTons / SAND_TONS_PER_YD, 1)} cubic yards and a tandem about{" "}
        {fmt(TRUCK.tandemTons / SAND_TONS_PER_YD, 1)}. Ask the yard whether it sells sand by the ton (as Mulch Pros in Georgia does) or by the yard (as
        Roseville Rock Supply in California does) and convert before comparing prices: at {fmt(SAND_TONS_PER_YD)} tons per yard, $69.95 a ton is about ${fmt(69.95 * SAND_TONS_PER_YD, 0)} a
        yard.
      </p>

      <h2>Measuring a sandbox or play area</h2>
      <p>
        Measure the inside of the frame, not the outside of the boards, and decide on the finished sand level before you buy: a sandbox filled to
        within a couple of inches of the top holds less than its nominal height. For round sandboxes, use the diameter — the calculator applies
        π × radius². Under play equipment, the CPSC use zone extends 6 ft beyond the equipment on every side, so a 10×12 ft play set needs sand over
        22×24 ft.
      </p>

      <h2>Common mistakes</h2>
      <ul>
        <li>Assuming a 50 lb bag is a cubic foot — it is about half of one.</li>
        <li>Compacting paver bedding sand before laying; it is screeded loose and the pavers are compacted into it.</li>
        <li>Using sand under tall play equipment, where CPSC rates it for only 4 ft falls.</li>
        <li>Loading a yard of sand — about 2,800 lb — into a pickup rated for 1,000 lb.</li>
      </ul>
      <p>
        Building the paver base too? Use the <Link href="/landscaping/paver-base-calculator">paver base calculator</Link>. For gravel, use the{" "}
        <Link href="/landscaping/gravel-calculator">gravel calculator</Link>; for playground wood chips, the{" "}
        <Link href="/landscaping/mulch-calculator">mulch calculator</Link>; and for a slab poured on a sand base, the{" "}
        <Link href="/concrete/slab-calculator">concrete slab calculator</Link>.
      </p>
    </>
  );
}

export const sandCalculator: CalculatorEntry<SandValues> = {
  meta: {
    slug: SLUG,
    category: "landscaping",
    name: "Sand Calculator",
    shortName: "Sand",
    h1: "Sand Calculator",
    metaTitle: "Sand Calculator: Bags, Tons & Cubic Yards (2026)",
    metaDescription:
      "How many bags or tons of sand you need — a cubic yard is 54 bags of 50 lb and about 1.4 tons. Play, all-purpose, mason and paver leveling sand.",
    summary:
      "Bags (0.5 cu ft, 50, 60, 70 lb), tons and cubic yards of sand for sandboxes, paver beds, playgrounds and slab bases — with bulk-vs-bag cost and pickup trips.",
    outputs: ["Bags by size", "Tons & cubic yards", "Bags vs bulk", "Pickup trips"],
    faq: [
      {
        q: "How many 50 lb bags of sand are in a cubic yard?",
        a: "54. A 50 lb bag holds about half a cubic foot and a cubic yard is 27 cubic feet. That is 45 bags of 60 lb or 39 bags of 70 lb.",
      },
      {
        q: "How much does a yard of sand weigh?",
        a: "About 1.4 tons (2,800 lb) loose and damp. Quarry calculators put it at 1.35–1.5 tons; dry sand is lighter and wet sand heavier.",
      },
      {
        q: "How many bags of sand are in a ton?",
        a: "40 bags of 50 lb, 34 bags of 60 lb or 29 bags of 70 lb. A ton of bulk sand is about 0.71 cubic yards.",
      },
      {
        q: "How much sand do I need under pavers?",
        a: "A 1 inch screeded bed (Unilock; Quikrete allows up to 2 inches). For 100 sq ft that is 8.33 cubic feet — 17 bags of 0.5 cu ft.",
      },
      {
        q: "How much play sand do I need for a sandbox?",
        a: "Multiply length × width × depth. A 5×5 ft sandbox filled 6 inches deep holds 12.5 cubic feet — 25 bags of 50 lb, or 28 with 10% extra.",
      },
      {
        q: "Is sand a safe playground surface?",
        a: "Only for low equipment. CPSC's public handbook rates 9 inches of sand for falls up to 4 feet; 9 inches of wood chips protects up to 10 feet.",
      },
    ],
    sources: [SOURCES.vulcan, SOURCES.martinMarietta, SOURCES.kokosing, SOURCES.mulchProsWeights, SOURCES.mulchProsPrices, SOURCES.rosevillePrices, SOURCES.sakreteSand, SOURCES.quikreteSandGravel, SOURCES.unilock, SOURCES.quikretePaverSand, SOURCES.cpsc325, SOURCES.irc],
    related: ["landscaping/paver-base-calculator", "landscaping/gravel-calculator", "concrete/slab-calculator", "landscaping/mulch-calculator", "measure/tons-to-cubic-yards", "landscaping/paver-calculator"],
    updated: LANDSCAPING_CHECKED,
    keywords: ["sand calculator", "play sand", "bags of sand", "tons of sand", "mason sand", "paver sand", "leveling sand", "sandbox"],
  },
  Calculator: SandCalculator,
  Content,
  presets: SAND_PRESETS,
  presetAnswer,
};
