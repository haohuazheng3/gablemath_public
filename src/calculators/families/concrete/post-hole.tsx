import Link from "next/link";
import type { CalculatorEntry, Preset, PresetAnswer } from "@/calculators/types";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { formatFeetInches } from "@/lib/units";
import { computePostHoles, postHoleCuft, quikreteCalcBags } from "./compute";
import { BAG_YIELD_CUFT, CONCRETE_CHECKED, POST_RULES, QUIKRETE_CALC_DEPTHS, QUIKRETE_CALC_PAIRS, QUIKRETE_TWO_BAG_CLAIM, SAKRETE_POST_TABLE, concreteSources, product } from "./data";
import PostHoleCalculator from "./PostHoleCalculator";
import { POST_DEFAULTS, embedFor, holeDiaFor, postInputFrom, postLabel, postType, postWidthIn, type PostValues } from "./post-model";

const SLUG = "post-hole-calculator";
const BASE = `/concrete/${SLUG}`;

const run = (v: PostValues) => computePostHoles(postInputFrom(v));
const mix = (r: ReturnType<typeof run>, productId: "fast" | "standard", size: 50 | 60 | 80) => r.mixes.find((m) => m.productId === productId && m.size === size);

/* ───────── programmatic presets ───────── */

type Spec = { slug: string; group: string; label: string; h1: string; values: Partial<PostValues>; note: string; title?: string };

const SPECS: Spec[] = [
  {
    slug: "4x4-post-2-ft-deep",
    group: "4×4 posts",
    label: "4×4 post, 2 ft deep",
    h1: "How many bags of concrete for a 4x4 post 2 feet deep?",
    values: { post: "4x4", above: 4 },
    note: "Two feet in the ground suits a 4 ft garden or picket fence, or a mailbox post with about 4 ft showing.",
  },
  {
    slug: "4x4-post-3-ft-deep",
    group: "4×4 posts",
    label: "4×4 post, 3 ft deep",
    h1: "How many bags of concrete for a 4x4 fence post 3 feet deep?",
    values: { post: "4x4", above: 6 },
    note: "This is the standard 6 ft privacy-fence post: 9 ft overall, a third of it underground.",
  },
  {
    slug: "4x4-post-4-ft-deep",
    group: "4×4 posts",
    label: "4×4 post, 4 ft deep",
    h1: "How much concrete for a 4x4 post 4 feet deep?",
    values: { post: "4x4", above: 6, embed: 48 },
    note: "Burying a 6 ft fence post 4 ft — deeper than the one-third rule, usually to get below the frost line — adds concrete in direct proportion to the extra depth.",
  },
  {
    slug: "4x4-post-80-lb-concrete-mix",
    group: "4×4 posts",
    label: "4×4 post, 80-lb Concrete Mix",
    h1: "How many 80 lb bags of concrete for a 4x4 fence post?",
    title: "80-lb Bags of Concrete per 4×4 Fence Post",
    values: { post: "4x4", above: 6, product: "standard", bag: 80, base: "drymix", cap: 0 },
    note: "This follows Quikrete's Concrete Mix sheet: 6 in of dry mix in the bottom, the post on top, mixed concrete up to the surface and sloped away from the post. It costs less per cubic foot than Fast-Setting, but the post must stay braced for 24 hours.",
  },
  {
    slug: "6x6-post-3-ft-deep",
    group: "6×6 & 4×6 posts",
    label: "6×6 post, 3 ft deep",
    h1: "How many bags of concrete for a 6x6 post 3 feet deep?",
    values: { post: "6x6", above: 6 },
    note: "6×6 posts carry gates, heavy privacy panels and arbors; the 3× rule makes the hole 16½ in wide, which is why they take so much more concrete than a 4×4.",
  },
  {
    slug: "6x6-post-4-ft-deep",
    group: "6×6 & 4×6 posts",
    label: "6×6 post, 4 ft deep",
    h1: "How much concrete for a 6x6 post 4 feet deep?",
    values: { post: "6x6", above: 8 },
    note: "An 8 ft tall 6×6 — a pergola, carport or tall gate post — goes 4 ft into the ground under the one-third rule. If it holds up a roof, local code and the frost line decide the depth.",
  },
  {
    slug: "4x6-gate-post-3-ft-deep",
    group: "6×6 & 4×6 posts",
    label: "4×6 gate post, 3 ft deep",
    h1: "How much concrete for a 4x6 gate post?",
    values: { post: "4x6", above: 6 },
    note: "A 4×6 hinge post resists a swinging gate better than a 4×4; the hole is sized from the wide face (5½ in × 3 = 16½ in).",
  },
  {
    slug: "5x5-vinyl-fence-post",
    group: "Vinyl & round posts",
    label: "5×5 vinyl post, 3 ft deep",
    h1: "How many bags of concrete for a 5x5 vinyl fence post?",
    values: { post: "5x5", above: 6 },
    note: "Vinyl posts are a true 5×5 in. Some vinyl kits call for a 10 in hole; enter that in the calculator to see the smaller count.",
  },
  {
    slug: "3-inch-round-post-30-inch-hole",
    group: "Vinyl & round posts",
    label: "3 in post in a 9 × 30 in hole",
    h1: "How many bags of Fast-Setting concrete for a 3 inch post 30 inches deep?",
    values: { post: "round", dia: 3, above: 5, base: "none" },
    note: "This is the case printed on Quikrete's Fast-Setting bag — a 3 in post in a 9 in hole 30 in deep — which claims two bags. Even with a 3 in soil cap the geometry needs about 2.4, so buy three.",
  },
  {
    slug: "2-inch-round-post-2-ft-deep",
    group: "Vinyl & round posts",
    label: "2 in steel post, 2 ft deep",
    h1: "How much concrete for a 2 inch steel post 2 feet deep?",
    values: { post: "round", dia: 2, above: 4 },
    note: "Small steel posts — chain-link line posts, signs, clothesline poles — need little concrete; a single 50-lb bag often sets one with some left over.",
  },
  {
    slug: "4-inch-round-post-3-ft-deep",
    group: "Vinyl & round posts",
    label: "4 in round post, 3 ft deep",
    h1: "How much concrete for a 4 inch round post 3 feet deep?",
    values: { post: "round", dia: 4, above: 6 },
    note: "Round 4 in posts (landscape timbers, steel pipe, basketball and swing-set legs) take a 12 in hole under the 3× rule.",
  },
  {
    slug: "10-fence-posts",
    group: "Whole fences",
    label: "10 posts, 6 ft fence",
    h1: "How many bags of concrete for 10 fence posts?",
    values: { post: "4x4", above: 6, count: 10 },
    note: "Ten posts at 8 ft spacing run about 72 ft of fence.",
  },
  {
    slug: "20-fence-posts",
    group: "Whole fences",
    label: "20 posts, 6 ft fence",
    h1: "How many bags of concrete for 20 fence posts?",
    values: { post: "4x4", above: 6, count: 20 },
    note: "Twenty posts at 8 ft spacing run about 152 ft of fence — at this size, carrying the bags becomes the hard part.",
  },
  {
    slug: "30-fence-posts",
    group: "Whole fences",
    label: "30 posts, 6 ft fence",
    h1: "How many bags of concrete for 30 fence posts?",
    values: { post: "4x4", above: 6, count: 30 },
    note: "Thirty posts at 8 ft spacing run about 232 ft of fence; at this count, ask the store about delivering a pallet.",
  },
  {
    slug: "10-posts-4-ft-fence",
    group: "Whole fences",
    label: "10 posts, 4 ft fence",
    h1: "How much concrete for 10 posts on a 4 ft fence?",
    values: { post: "4x4", above: 4, count: 10 },
    note: "A 4 ft picket or garden fence buries each post 2 ft, so it needs about two-thirds of the concrete a 6 ft fence does.",
  },
  {
    slug: "20-posts-4-ft-fence",
    group: "Whole fences",
    label: "20 posts, 4 ft fence",
    h1: "How much concrete for 20 posts on a 4 ft fence?",
    values: { post: "4x4", above: 4, count: 20 },
    note: "Twenty 4×4s for a 4 ft fence — a common front-yard or garden enclosure.",
  },
  {
    slug: "4-pergola-posts-6x6",
    group: "Whole fences",
    label: "4 pergola posts, 6×6",
    h1: "How much concrete for 4 pergola posts (6x6)?",
    values: { post: "6x6", above: 8, count: 4 },
    note: "A pergola is a structure: many jurisdictions want its posts on footings below the frost line, so check the permit rules before you dig.",
  },
];

export const POST_PRESETS: Preset<PostValues>[] = SPECS.map((s) => {
  const v: PostValues = { ...POST_DEFAULTS, ...s.values };
  const r = run(v);
  const fs = mix(r, "fast", 50);
  const cm = mix(r, "standard", 80);
  const many = v.count > 1;
  const lead = v.product === "standard" ? `${fmt(cm?.perPost ?? 0, 1)} × 80-lb Concrete Mix or ${fmt(fs?.perPost ?? 0, 1)} × 50-lb Fast-Setting` : `${fmt(fs?.perPost ?? 0, 1)} × 50-lb Fast-Setting or ${fmt(cm?.perPost ?? 0, 1)} × 80-lb Concrete Mix`;
  return {
    slug: s.slug,
    values: v,
    group: s.group,
    label: s.label,
    h1: s.h1,
    metaTitle: s.title ? `${s.title}: ${fmt(cm?.perPost ?? 0, 1)}` : many ? `Concrete for ${v.count} Posts (${postLabel(v)}, ${fmt(embedFor(v) / 12, 1)} ft deep): ${fmtInt(r.order.bags)} Bags` : `Concrete for a ${postLabel(v)} Post, ${fmt(embedFor(v), 0)} in Deep`,
    metaDescription: many
      ? `${v.count} posts (${postLabel(v)}) set ${fmt(embedFor(v), 0)} in deep take ${fmtInt(fs?.total ?? 0)} × 50-lb Fast-Setting or ${fmtInt(cm?.total ?? 0)} × 80-lb Concrete Mix bags with 10% extra. Hole size, water, cost.`
      : `A ${postLabel(v)} post ${fmt(embedFor(v), 0)} in deep takes ${lead} bags. Hole size, ${v.base === "drymix" ? "dry-mix base" : "gravel"}, water and set time.`,
  };
});

function presetAnswer(v: PostValues): PresetAnswer {
  const r = run(v);
  const fs = mix(r, "fast", 50)!;
  const cm = mix(r, "standard", 80)!;
  const spec = SPECS.find((s) => sameValues({ ...POST_DEFAULTS, ...s.values }, v));
  const name = postLabel(v);
  const embed = embedFor(v);
  const hole = holeDiaFor(v);
  const base = postInputFrom(v).base;
  const width = postWidthIn(v);
  const t = postType(v);
  const postArea = t.id === "round" ? Math.PI * (v.dia / 2) ** 2 : t.w * t.d;
  const holeArea = Math.PI * (hole / 2) ** 2;
  const many = v.count > 1;
  const sel = r.order;

  const rows = [24, 30, 36, 42, 48].map((d) => {
    const x = run({ ...v, embed: d });
    return [
      `${d} in${d === Math.round(embed) ? " ←" : ""}`,
      `${fmt(x.holeDepthIn, 0)} in`,
      fmt(mix(x, "fast", 50)!.perPost, 1),
      fmt(mix(x, "standard", 80)!.perPost, 1),
      ...(many ? [fmtInt(mix(x, "fast", 50)!.total)] : []),
    ];
  });

  const bottom = base === "gravel" ? `${fmt(v.baseIn, 0)} in of gravel` : base === "drymix" ? `${fmt(v.baseIn, 0)} in of dry Concrete Mix` : "no base layer";
  const fullDepth = Math.ceil(postHoleCuft(hole, postArea, r.holeDepthIn) / BAG_YIELD_CUFT[50] - 1e-9);

  return {
    headline: many
      ? `${v.count} posts (${name}) set ${fmt(embed, 0)} in deep take ${fmtInt(fs.total)} × 50-lb bags of Fast-Setting concrete (or ${fmtInt(cm.total)} × 80-lb Concrete Mix), including 10% extra — about ${fmt(fs.perPost, 1)} bags per post.`
      : v.product === "standard"
        ? `A ${name} post set ${fmt(embed, 0)} in deep takes about ${fmt(cm.perPost, 1)} × 80-lb bags of Concrete Mix — buy ${fmtInt(cm.total)} with 10% extra (or ${fmtInt(fs.total)} × 50-lb Fast-Setting).`
        : fs.total === 1 && cm.total === 1
          ? `A ${name} post set ${fmt(embed, 0)} in deep takes about ${fmt(fs.perPost, 1)} of a 50-lb bag of Fast-Setting concrete — one bag of Fast-Setting or 80-lb Concrete Mix covers it.`
          : `A ${name} post set ${fmt(embed, 0)} in deep takes about ${fmt(fs.perPost, 1)} × 50-lb bags of Fast-Setting concrete or ${fmt(cm.perPost, 1)} × 80-lb bags of Concrete Mix — buy ${fmtInt(fs.total)} or ${fmtInt(cm.total)} with 10% extra.`,
    bullets: [
      base === "none"
        ? `Hole: ${fmt(hole, 1)} in wide (about 3× the ${fmt(width, 1)} in post) and ${fmt(r.holeDepthIn, 0)} in deep, with the post standing on the hole bottom.`
        : `Hole: ${fmt(hole, 1)} in wide (about 3× the ${fmt(width, 1)} in post) and ${fmt(r.holeDepthIn, 0)} in deep — ${fmt(embed, 0)} in for the post plus ${bottom}.`,
      `Concrete per post: ${fmt(r.cuftPerPost, 2)} cu ft${base === "drymix" ? ", counting the dry-mix plug," : ""} with the top ${v.cap > 0 ? `${fmt(v.cap, 0)} in below grade` : "flush with the ground"} (${fmt(r.concreteDepthIn, 0)} in of concrete around the post).`,
      `${many ? "For all posts" : "Bags"}: ${fmtInt(fs.total)} × 50-lb Fast-Setting${fs.cost != null ? ` (about ${fmtMoney(fs.cost)})` : ""} or ${fmtInt(cm.total)} × 80-lb Concrete Mix${cm.cost != null ? ` (about ${fmtMoney(cm.cost)})` : ""}.`,
      v.product === "fast"
        ? `Pour it dry and soak it with about ${fmt(r.waterGal[0], 0)} gal of water in all; the post can take rails after 4 hours.${r.lifts > 1 ? ` The ${fmt(r.concreteDepthIn, 0)} in fill goes in ${r.lifts} lifts of 30 in or less.` : ""}`
        : `Mix the ${fmtInt(sel.bags)} bags with ${fmt(sel.waterGal[0], 0)}–${fmt(sel.waterGal[1], 0)} gal of water before placing the concrete, and brace the post for 24 hours.`,
      `Post length: ${formatFeetInches(r.postLengthIn / 12)} (${formatFeetInches(v.above)} above ground + ${fmt(embed, 0)} in buried).`,
      spec?.note ?? "",
    ].filter(Boolean),
    table: {
      caption: `${name} post${many ? "s" : ""} at other depths (same ${fmt(hole, 1)} in hole and base)`,
      columns: ["Post in ground", "Hole depth", "50-lb Fast-Setting / post", "80-lb Concrete Mix / post", ...(many ? [`50-lb bags for ${v.count}`] : [])],
      rows,
    },
    notes: [
      `The hole is a cylinder: π × (${fmt(hole, 1)} ÷ 2)² = ${fmt(holeArea, 1)} sq in. The post takes up ${fmt(postArea, 1)} sq in, leaving ${fmt(holeArea - postArea, 1)} sq in of concrete for every inch of depth. Concrete runs ${fmt(r.concreteDepthIn, 0)} in around the post: ${fmt(holeArea - postArea, 1)} × ${fmt(r.concreteDepthIn, 0)} = ${fmtInt((holeArea - postArea) * r.concreteDepthIn)} cu in${base === "drymix" ? `, plus the ${fmt(v.baseIn, 0)} in dry-mix plug (${fmt(holeArea, 1)} × ${fmt(v.baseIn, 0)} = ${fmtInt(holeArea * v.baseIn)} cu in)` : ""}. ${fmtInt(r.cuftPerPost * 1728)} cu in ÷ 1,728 = ${fmt(r.cuftPerPost, 2)} cu ft.`,
      `A 50-lb bag of Fast-Setting makes ${BAG_YIELD_CUFT[50]} cu ft and an 80-lb bag of Concrete Mix makes ${BAG_YIELD_CUFT[80]} cu ft, giving ${fmt(fs.perPost, 2)} and ${fmt(cm.perPost, 2)} bags per post.${many ? ` Rounded once for all ${v.count} posts with 10% extra, that is ${fmtInt(fs.total)} bags — opening fresh bags for every hole would take ${fmtInt(r.bagsPerHoleRounded * v.count)}.` : ""}`,
      fullDepth > Math.ceil(fs.perPost - 1e-9)
        ? `If you filled the hole to the brim with no gravel or soil cap — how bag labels and Quikrete's online calculator count — it would take ${fullDepth} bags of Fast-Setting per post. The base and soil cap save ${fullDepth - Math.ceil(fs.perPost - 1e-9)} bag${fullDepth - Math.ceil(fs.perPost - 1e-9) === 1 ? "" : "s"} per hole.`
        : `Filled to the brim the way bag labels count, this hole takes the same ${fullDepth} bags of Fast-Setting — here the label and the geometry agree.`,
    ],
  };
}

function sameValues(a: PostValues, b: PostValues): boolean {
  return (Object.keys(POST_DEFAULTS) as (keyof PostValues)[]).every((k) => a[k] === b[k]);
}

/* ───────── long-form guide ───────── */

function Content() {
  const examples: { label: string; v: PostValues; slug?: string }[] = [
    { label: "4×4, 4 ft fence (24 in buried)", v: { ...POST_DEFAULTS, above: 4 }, slug: "4x4-post-2-ft-deep" },
    { label: "4×4, 6 ft fence (36 in buried)", v: { ...POST_DEFAULTS, above: 6 }, slug: "4x4-post-3-ft-deep" },
    { label: "4×4, 48 in buried", v: { ...POST_DEFAULTS, above: 6, embed: 48 }, slug: "4x4-post-4-ft-deep" },
    { label: "5×5 vinyl, 36 in buried", v: { ...POST_DEFAULTS, post: "5x5", above: 6 }, slug: "5x5-vinyl-fence-post" },
    { label: "6×6, 36 in buried", v: { ...POST_DEFAULTS, post: "6x6", above: 6 }, slug: "6x6-post-3-ft-deep" },
    { label: "6×6, 48 in buried", v: { ...POST_DEFAULTS, post: "6x6", above: 8 }, slug: "6x6-post-4-ft-deep" },
  ];
  const def = run(POST_DEFAULTS);
  const claim = QUIKRETE_TWO_BAG_CLAIM;
  const claimBags = postHoleCuft(claim.holeIn, claim.postIn * claim.postIn, claim.depthIn) / BAG_YIELD_CUFT[50];
  return (
    <>
      <h2>How much concrete does a post hole take?</h2>
      <p>
        A post hole is a cylinder with the post standing in the middle, so the concrete is <strong>(hole area − post area) × concrete depth</strong>. Work in inches and divide by 1,728 to get cubic
        feet, then divide by the bag yield from the manufacturer&apos;s data sheet: 0.375 cu ft for a 50-lb bag of Fast-Setting, 0.45 for 60 lb, 0.60 for an 80-lb bag of Concrete Mix.
      </p>
      <p>
        <strong>Worked example — a 6 ft fence on 4×4 posts:</strong> bury a third of the 9 ft post (36 in), dig a hole 3× the post width (10½ in) and put 6 in of gravel in the bottom. The concrete runs
        from the gravel to 3 in below grade, so it is {fmt(def.concreteDepthIn, 0)} in deep. Hole area {fmt(Math.PI * (def.holeDiaIn / 2) ** 2, 1)} sq in − post {fmt(def.postAreaSqIn, 2)} sq in ={" "}
        {fmt(Math.PI * (def.holeDiaIn / 2) ** 2 - def.postAreaSqIn, 1)} sq in × {fmt(def.concreteDepthIn, 0)} in = {fmtInt(def.cuftPerPost * 1728)} cu in = {fmt(def.cuftPerPost, 2)} cu ft. That is{" "}
        <strong>{fmt(def.bagsPerPost, 1)} bags of 50-lb Fast-Setting per post</strong>. For a whole fence, multiply by the number of posts, add 10% and round up once.
      </p>

      <h2>Hole size and depth rules</h2>
      <ul>
        <li>
          <strong>Width: about 3× the post.</strong> Quikrete and Sakrete both say so: 10½ in for a 4×4 (3½ in actual), 16½ in for a 6×6 (5½ in actual). If your auger is a different size, enter the real
          hole diameter — the count changes a lot with it.
        </li>
        <li>
          <strong>Depth: one-third of the post&apos;s overall length.</strong> That is the same as half the height above ground — a 6 ft fence needs 3 ft in the ground and a 9 ft post.
        </li>
        <li>
          <strong>Bottom of the hole:</strong> Quikrete&apos;s how-to adds 6 in of gravel for drainage; its Concrete Mix sheet puts 6 in of dry mix there instead; its Fast-Setting sheet stands the post on the
          soil. Sakrete&apos;s sheets call for 3–6 in of gravel. The calculator handles all three.
        </li>
        <li>
          <strong>Top of the hole:</strong> stop the concrete {POST_RULES.capIn}–4 in below grade and finish with soil or sod, or bring it flush and slope it away from the post so water runs off.
        </li>
        <li>
          <strong>Frost:</strong> posts that hold up a structure (deck, pergola, carport) must reach at least {POST_RULES.belowFrostIn} in below the frost line, and local code decides. Call 811 before you dig.
        </li>
      </ul>

      <h2>Bags per post for common fences</h2>
      <p>Hole 3× the post, 6 in gravel, concrete stopped 3 in below grade, no waste added:</p>
      <table>
        <thead>
          <tr>
            <th>Post</th>
            <th>Hole</th>
            <th>50-lb Fast-Setting</th>
            <th>80-lb Concrete Mix</th>
          </tr>
        </thead>
        <tbody>
          {examples.map((e) => {
            const r = run(e.v);
            return (
              <tr key={e.label}>
                <td>{e.slug ? <Link href={`${BASE}/${e.slug}`}>{e.label}</Link> : e.label}</td>
                <td>
                  {fmt(r.holeDiaIn, 1)} × {fmt(r.holeDepthIn, 0)} in
                </td>
                <td>{fmt(mix(r, "fast", 50)!.perPost, 1)}</td>
                <td>{fmt(mix(r, "standard", 80)!.perPost, 1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2>Fast-Setting or regular Concrete Mix?</h2>
      <p>
        <strong>Fast-Setting</strong> goes into the hole dry: fill to 3–4 in below grade, then add about 1 gallon of water per 50-lb bag and let it soak in. For holes deeper than 30 in, fill and soak in
        lifts of 30 in or less. It sets in 20–40 minutes and the post can take rails after 4 hours. <strong>Concrete Mix</strong> costs less per cubic foot ({fmtMoney(CM_PER_CUFT)} vs{" "}
        {fmtMoney(FS_PER_CUFT)} at typical 2026 prices) but has to be mixed first, and the post must stay braced for 24 hours. On a long fence that difference adds up — the calculator shows both.
      </p>

      <h2>Why manufacturer numbers disagree</h2>
      <p>
        Quikrete&apos;s Fast-Setting bag says two 50-lb bags set a 3 in post in a 9 in hole 30 in deep. The geometry says that hole holds {fmt(claimBags, 2)} bags filled to the top, and Quikrete&apos;s own
        online calculator rounds a 3 in round post at 30 in up to {quikreteCalcBags(3, 9, 30)}. Plan on three. Sakrete&apos;s table for a {SAKRETE_POST_TABLE.holeIn} in hole lists{" "}
        {SAKRETE_POST_TABLE.rows.map(([d, b]) => `${b} bags at ${d} in`).join(", ")} — within a quarter bag of the same math for a 4×4. Quikrete&apos;s calculator only offers round posts:
      </p>
      <table>
        <thead>
          <tr>
            <th>Post / hole</th>
            {QUIKRETE_CALC_DEPTHS.map((d) => (
              <th key={d}>{d} in</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {QUIKRETE_CALC_PAIRS.map(([post, hole]) => (
            <tr key={post}>
              <td>
                {post} in post, {hole} in hole
              </td>
              {QUIKRETE_CALC_DEPTHS.map((d) => (
                <td key={d}>{quikreteCalcBags(post, hole, d)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p>Those counts fill the whole hole with concrete; a gravel base and soil cap lower them, which is why this calculator usually comes in under the bag label.</p>

      <h2>Common mistakes</h2>
      <ul>
        <li>Using the nominal size: a 4×4 is 3½ in, so the hole is 10½ in, not 12.</li>
        <li>Rounding up for every hole: pour the leftover half bag into the next hole and round once for the job.</li>
        <li>Mounding concrete above grade so water pools against the post — crown it away or stop below grade.</li>
        <li>Hanging gates or stretching wire before the concrete is ready: 4 hours for Fast-Setting, 24 hours for Concrete Mix.</li>
      </ul>
      <p>
        Planning the whole fence? The <Link href="/fence/fence-calculator">fence calculator</Link> counts posts, rails and pickets. Setting deck or porch piers in tubes instead? Use the{" "}
        <Link href="/concrete/column-calculator">Sonotube calculator</Link> or the <Link href="/concrete/footing-calculator">footing calculator</Link>.
      </p>
    </>
  );
}

const DEF = run(POST_DEFAULTS);
const CM_PER_CUFT = (product("standard").price[80] ?? 0) / BAG_YIELD_CUFT[80];
const FS_PER_CUFT = (product("fast").price[50] ?? 0) / BAG_YIELD_CUFT[50];
const DEF_CM = mix(DEF, "standard", 80)!;
const TWENTY = run({ ...POST_DEFAULTS, count: 20 });

export const postHoleCalculator: CalculatorEntry<PostValues> = {
  meta: {
    slug: SLUG,
    category: "concrete",
    name: "Post Hole Concrete Calculator",
    shortName: "Fence & mailbox posts",
    h1: "Post Hole Concrete Calculator",
    metaTitle: "Concrete for Fence Posts: Bags per Post Calculator",
    metaDescription: `How many bags of concrete per fence post? A 6 ft 4×4 post takes about ${fmt(DEF.bagsPerPost, 1)} × 50-lb Fast-Setting bags. Any post size, hole, depth or post count.`,
    summary: "Pick the post size, height and number of posts to get bags of Fast-Setting or regular concrete per post and for the whole fence — with hole size, gravel, water and set times.",
    outputs: ["Bags per post", "Bags for every post", "Hole size & depth", "Water & set time"],
    faq: [
      {
        q: "How many bags of concrete do I need per 4x4 fence post?",
        a: `For a 6 ft fence — 36 in buried in a 10½ in hole with 6 in of gravel and the concrete stopped 3 in below grade — about ${fmt(DEF.bagsPerPost, 1)} × 50-lb bags of Fast-Setting or ${fmt(DEF_CM.perPost, 1)} × 80-lb bags of Concrete Mix per post. Add 10% and round up once for the whole fence.`,
      },
      { q: "How deep should a fence post hole be?", a: "Bury one-third of the post's overall length, which equals half the height above ground: a 6 ft fence needs 3 ft in the ground and a 9 ft post. Add 6 in if you put gravel in the bottom, and go below the frost line for posts that support a structure." },
      { q: "How wide should a post hole be?", a: "About three times the post width, according to both Quikrete and Sakrete: 10½ in for a 4×4 (3½ in actual) and 16½ in for a 6×6 (5½ in actual)." },
      { q: "Should I put gravel under a fence post?", a: "Quikrete's how-to puts 6 in of gravel in the bottom for drainage, its Concrete Mix sheet uses 6 in of dry concrete mix instead, and its Fast-Setting sheet sets the post straight on the soil. Gravel saves concrete and keeps water off the end grain." },
      { q: "Do you mix Fast-Setting concrete before pouring it in a post hole?", a: "No. Pour it dry to 3–4 in below grade, then add about 1 gallon of water per 50-lb bag. In holes deeper than 30 in, fill and soak in lifts. It sets in 20–40 minutes and can take load after 4 hours." },
      { q: "Is it true two bags of Quikrete set a fence post?", a: `Quikrete says two 50-lb bags set a 3 in post in a 9 in hole 30 in deep, but that hole holds about 2.5 bags filled to the top and Quikrete's own calculator says ${quikreteCalcBags(3, 9, 30)}. Buy three, or use this calculator for your exact post and hole.` },
      { q: "How many bags of concrete for 20 fence posts?", a: `For 4×4 posts on a 6 ft fence (36 in deep, 10½ in holes, 6 in gravel), 20 posts take ${fmtInt(TWENTY.order.bags)} × 50-lb bags of Fast-Setting with 10% extra — about ${fmtInt(TWENTY.order.weightLb)} lb to haul.` },
    ],
    sources: concreteSources("qkFast", "qk1101", "qkPostsHowTo", "qkCalculator", "sakreteFast", "sakreteGravel", "retail"),
    related: ["fence/fence-calculator", "fence/chain-link-fence-calculator", "concrete/column-calculator", "concrete/footing-calculator", "lumber/deck-calculator"],
    updated: CONCRETE_CHECKED,
    keywords: ["fence post concrete", "post hole", "bags per post", "quikrete fast setting", "4x4 post", "6x6 post", "mailbox post", "how much concrete for a fence post"],
  },
  Calculator: PostHoleCalculator,
  Content,
  presets: POST_PRESETS,
  presetAnswer,
};
