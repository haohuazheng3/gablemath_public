import { ceilQty, fmt, fmtInt } from "@/lib/format";
import { formatFeetInches } from "@/lib/units";
import { defineTool } from "../types";

// 2021 IRC R311.7: risers 7-3/4 in max, treads 10 in min (measured nosing to nosing),
// headroom 6 ft 8 in, width 36 in. AWC DCA 6: cut stringers at most 18 in apart, 5 in of wood
// left below the notches.
export const IRC_STAIR = { maxRiserIn: 7.75, minTreadIn: 10, headroomIn: 80, minWidthIn: 36 };

export function planStairs(totalRiseIn: number, targetRiserIn: number, treadIn: number) {
  const risers = Math.max(1, ceilQty(totalRiseIn / targetRiserIn));
  const riser = totalRiseIn / risers;
  const treads = risers - 1;
  const runIn = treads * treadIn;
  const stringerIn = Math.sqrt(totalRiseIn ** 2 + runIn ** 2);
  const angle = (Math.atan(riser / treadIn) * 180) / Math.PI;
  return { risers, riser, treads, runIn, stringerIn, angle, comfort: 2 * riser + treadIn };
}

export const stairs = defineTool({
  key: "lumber/stair-calculator",
  name: "Stair Calculator",
  unitToggle: true,
  defaults: { rise: 108, target: 7.5, tread: 10.5, width: 36 },
  sections: [
    {
      fields: [
        { kind: "length", key: "rise", label: "Total rise (finished floor to finished floor)", base: "in", help: "Measure plumb from the lower finished floor (or the ground at the landing) to the top of the upper finished floor." },
        {
          kind: "segmented",
          key: "target",
          label: "Riser height to aim for",
          columns: 3,
          options: [
            { value: 7, label: "7 in", sub: "gentle" },
            { value: 7.5, label: "7-1/2 in", sub: "typical" },
            { value: 7.75, label: "7-3/4 in", sub: "IRC max" },
          ],
        },
        {
          kind: "segmented",
          key: "tread",
          label: "Tread depth (nosing to nosing)",
          columns: 4,
          options: [
            { value: 10, label: "10 in", sub: "IRC min" },
            { value: 10.5, label: "10-1/2" },
            { value: 11, label: "11 in" },
            { value: 11.25, label: "11-1/4", sub: "2×12 tread" },
          ],
        },
        { kind: "length", key: "width", label: "Stair width", base: "in", help: "36 in minimum under the IRC." },
      ],
    },
  ],
  compute(v) {
    const rise = Number(v.rise);
    const tread = Number(v.tread);
    const s = planStairs(rise, Number(v.target), tread);
    const stringers = Math.max(2, ceilQty(Number(v.width) / 18) + 1);
    const stringerFt = s.stringerIn / 12;
    const stock = [8, 10, 12, 14, 16, 18, 20].find((x) => x >= stringerFt + 0.5) ?? 20;
    const tooSteep = s.riser > IRC_STAIR.maxRiserIn + 1e-6;
    const tooShallow = tread < IRC_STAIR.minTreadIn - 1e-6;
    const narrow = Number(v.width) < IRC_STAIR.minWidthIn - 1e-6;
    const nosing = tread < 11;
    return {
      hero: {
        label: `${formatFeetInches(rise / 12)} total rise`,
        value: `${s.risers}`,
        unit: `risers of ${fmt(s.riser, 3)} in`,
        sub: `${s.treads} treads at ${fmt(tread, 2)} in · total run ${formatFeetInches(s.runIn / 12)} · ${stringers} stringers from 2×12 × ${stock} ft · ${fmt(s.angle, 1)}° slope`,
      },
      dock: `${s.risers} risers × ${fmt(s.riser, 2)}"`,
      stats: [
        { label: "Riser height", value: fmt(s.riser, 3), unit: "in", hint: `≈ ${formatFeetInches(s.riser / 12)}`, emphasis: tooSteep },
        { label: "Treads", value: fmtInt(s.treads), hint: "One fewer than risers — the top floor is the last step" },
        { label: "Total run", value: formatFeetInches(s.runIn / 12), hint: "Floor space the stairs take up" },
        { label: "Stringer length", value: formatFeetInches(stringerFt), hint: `Cut from a ${stock} ft 2×12` },
        { label: "Code check", value: tooSteep || tooShallow || narrow ? "Fails IRC" : "Meets IRC", hint: "Riser ≤ 7-3/4, tread ≥ 10, width ≥ 36 in", emphasis: tooSteep || tooShallow || narrow },
        { label: "Comfort (2R + T)", value: fmt(s.comfort, 1), unit: "in", hint: "24–25 in feels natural" },
      ],
      tables: [
        {
          title: "Other riser counts for the same rise",
          caption: "Riser options",
          columns: ["Risers", "Riser height", "Total run", "Code"],
          rows: [-1, 0, 1, 2]
            .map((d) => s.risers + d)
            .filter((n) => n > 1)
            .map((n) => {
              const r = rise / n;
              return [fmtInt(n), `${fmt(r, 3)} in`, formatFeetInches(((n - 1) * tread) / 12), r <= IRC_STAIR.maxRiserIn + 1e-6 ? "OK" : "Too steep"];
            }),
          highlight: 1,
        },
      ],
      notes: [
        ...(tooSteep ? [{ tone: "warn" as const, text: `${fmt(s.riser, 2)} in risers are over the IRC's 7-3/4 in maximum. Add a riser.` }] : []),
        ...(narrow ? [{ tone: "warn" as const, text: "The IRC requires stairways at least 36 in wide." }] : []),
        ...(nosing ? [{ tone: "info" as const, text: "With treads under 11 in deep, the IRC requires a nosing of 3/4 to 1-1/4 in on each tread." }] : []),
        { tone: "tip", text: "Every riser must be within 3/8 in of the others. Measure the total rise after the finished flooring is down, or account for its thickness at the top and bottom step." },
      ],
      shopping: [{ id: "stringers", name: `2×12 × ${stock} ft (stringers)`, qty: stringers, unit: "boards" }],
      summary: `${s.risers} risers at ${fmt(s.riser, 3)} in and ${s.treads} treads at ${fmt(tread, 2)} in for a ${fmt(rise, 1)} in rise`,
    };
  },
});
