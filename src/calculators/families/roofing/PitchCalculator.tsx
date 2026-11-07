"use client";

import { useMemo } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { FieldSection, LengthField, NumberField, Segmented } from "@/components/calc/fields";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { useCalcState } from "@/components/calc/useCalcState";
import { fmt } from "@/lib/format";
import { formatFeetInches } from "@/lib/units";
import { computePitch, hipFactor, pitchAngle, pitchFactor } from "./compute";
import { METAL_PROFILES, PITCH, PITCH_CLASS_NOTES, PITCH_OPTIONS } from "./data";
import { PITCH_DEFAULTS, pitchInputFrom, type PitchValues } from "./pitch-model";
import { PitchTriangle } from "./RoofDiagrams";

const CALC_KEY = "roofing/roof-pitch-calculator";
const TABLE_PITCHES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 24];

export default function PitchCalculator({ initial }: { initial?: Partial<PitchValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, PITCH_DEFAULTS, initial);
  const r = useMemo(() => computePitch(pitchInputFrom(v)), [v]);
  const pitchText = `${fmt(r.rise, 2)}/12`;
  const note = PITCH_CLASS_NOTES[r.pitchClass];
  const rafterTitle = `Common rafter for a ${formatFeetInches(v.span)} span`;
  const ribPanel = METAL_PROFILES[0];

  const allowed: [string, number, string][] = [
    ["Asphalt shingles", PITCH.shingleMin, r.rise < PITCH.doubleUnderlaymentBelow && r.rise >= PITCH.shingleMin ? "Yes — double underlayment" : ""],
    [`${ribPanel.short} (maker)`, ribPanel.minRise, ""],
    ["Lapped metal, no sealant (IRC)", PITCH.metalLappedMin, ""],
    ["Lapped metal with lap sealant", PITCH.metalSealedMin, ""],
    ["Standing seam metal", PITCH.standingSeamMin, ""],
  ];

  return (
    <CalcFrame
      showUnitToggle={false}
      dock={{ label: "Pitch", value: `${pitchText} · ${fmt(r.angleDeg, 1)}°` }}
      inputs={
        <>
          <FieldSection title="What do you know?">
            <Segmented
              label="Start from"
              value={v.mode}
              options={[
                { value: "pitch", label: "Pitch", sub: "x in 12" },
                { value: "angle", label: "Angle", sub: "degrees" },
                { value: "measure", label: "Measured", sub: "rise & run" },
              ]}
              onChange={(mode) => set({ mode })}
            />
            {v.mode === "pitch" ? (
              <>
                <Segmented label="Common pitches" columns={4} value={PITCH_OPTIONS.includes(v.rise) ? v.rise : -1} options={PITCH_OPTIONS.map((x) => ({ value: x, label: `${x}/12` }))} onChange={(rise) => rise >= 0 && set({ rise })} />
                <NumberField label="Rise per 12 in of run" value={v.rise} onChange={(rise) => set({ rise })} suffix="/12" step={0.5} max={48} decimals={2} />
              </>
            ) : v.mode === "angle" ? (
              <NumberField label="Roof angle" value={v.angle} onChange={(angle) => set({ angle })} suffix="°" step={0.5} max={85} decimals={2} help="From a phone level app or an angle finder laid on the shingles." />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <LengthField label="Rise (vertical)" base="in" value={v.mRise} onChange={(mRise) => set({ mRise })} allowZero />
                <LengthField label="Run (level)" base="in" value={v.mRun} onChange={(mRun) => set({ mRun })} />
              </div>
            )}
            {v.mode === "measure" ? (
              <p className="-mt-2 text-[0.78rem] leading-snug text-ink-3">Touch one end of a level to the roof or a rafter and hold it level (bubble centered). Mark 12 in along it and measure the vertical gap from the mark to the roof. Any run works — 24 in is more accurate.</p>
            ) : null}
          </FieldSection>

          <FieldSection title="Rafter length (optional)">
            <div className="grid grid-cols-2 gap-3">
              <LengthField label="Building width" value={v.span} onChange={(span) => set({ span })} hint="wall to wall" />
              <LengthField label="Overhang" base="in" value={v.oh} onChange={(oh) => set({ oh })} allowZero hint="level" />
            </div>
          </FieldSection>
        </>
      }
      results={
        <>
          <ResultHero
            label="Roof pitch"
            value={pitchText}
            sub={
              <>
                {fmt(r.angleDeg, 2)}° · {fmt(r.gradePct, 1)}% grade · slope multiplier {fmt(r.factor, 3)}
              </>
            }
          />
          <div className="flex justify-center rounded-[18px] border border-line bg-surface-2 px-3 py-4">
            <PitchTriangle rise={r.rise} angleDeg={r.angleDeg} />
          </div>
          <StatGrid
            stats={[
              { label: "Angle", value: fmt(r.angleDeg, 2), unit: "°", emphasis: true },
              { label: "Slope multiplier", value: `×${fmt(r.factor, 3)}`, hint: "plan area → roof area" },
              { label: "Hip / valley factor", value: `×${fmt(r.hipFactor, 3)}`, hint: "× half the span = hip length" },
              { label: "Grade", value: fmt(r.gradePct, 1), unit: "%" },
            ]}
          />

          {v.span > 0 ? (
            <div className="rounded-[18px] border border-line p-4">
              <h3 className="text-[0.95rem] font-semibold text-ink">{rafterTitle}</h3>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <dt className="text-[0.74rem] text-ink-3">Rafter incl. {fmt(v.oh, 1)}-in overhang</dt>
                  <dd className="num text-[1.05rem] font-semibold text-ink">{formatFeetInches(r.rafterFt)}</dd>
                </div>
                <div>
                  <dt className="text-[0.74rem] text-ink-3">Ridge height above the walls</dt>
                  <dd className="num text-[1.05rem] font-semibold text-ink">{formatFeetInches(r.ridgeHeightFt)}</dd>
                </div>
                <div>
                  <dt className="text-[0.74rem] text-ink-3">Wall to ridge (no overhang)</dt>
                  <dd className="num text-[1.05rem] font-semibold text-ink">{formatFeetInches(r.rafterNoOverhangFt)}</dd>
                </div>
                <div>
                  <dt className="text-[0.74rem] text-ink-3">Hip rafter, wall to ridge</dt>
                  <dd className="num text-[1.05rem] font-semibold text-ink">{formatFeetInches(r.runFt * r.hipFactor)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[0.78rem] leading-snug text-ink-3">
                ({fmt(v.span / 2, 2)} ft run + {fmt(v.oh / 12, 2)} ft overhang) × {fmt(r.factor, 3)}. Measured along the top edge; deduct half the ridge-board thickness and allow for the plumb and tail cuts when you lay out the board.
              </p>
            </div>
          ) : null}

          <Callout tone={r.pitchClass === "conventional" ? "ok" : r.pitchClass === "flat" ? "warn" : "info"} title={note.title}>
            {note.body}
          </Callout>

          <ResultsHeading>What can go on a {pitchText} roof?</ResultsHeading>
          <OptionTable
            caption="Minimum slopes by roofing type"
            columns={["Roofing", "Minimum", "Here"]}
            rows={allowed.map(([name, min, extra]) => [name, `${fmt(min, 2)}/12`, r.rise >= min ? extra || "Yes" : "No — too flat"])}
          />

          <ResultsHeading>Pitch table</ResultsHeading>
          <OptionTable
            caption="Roof pitch to angle and multipliers"
            columns={["Pitch", "Angle", "Slope factor", "Hip factor"]}
            highlight={TABLE_PITCHES.findIndex((x) => Math.abs(x - r.rise) < 0.01)}
            rows={TABLE_PITCHES.map((x) => [`${x}/12`, `${fmt(pitchAngle(x), 2)}°`, fmt(pitchFactor(x), 3), fmt(hipFactor(x), 3)])}
          />

          <div className="rounded-[18px] border border-line p-4">
            <h3 className="text-[0.95rem] font-semibold text-ink">Three safe ways to measure</h3>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[0.86rem] leading-relaxed text-ink-2">
              <li>
                <strong className="text-ink">In the attic:</strong> touch one end of a level to the underside of a rafter and hold it level, mark 12 in along it, and measure straight up to the rafter. That number is your pitch.
              </li>
              <li>
                <strong className="text-ink">At the gable end, from a ladder:</strong> do the same against the rake board — no need to walk the roof.
              </li>
              <li>
                <strong className="text-ink">With a phone:</strong> lay it on the shingles (or a rafter) with a level app and read the angle, then switch this calculator to Angle.
              </li>
            </ol>
          </div>
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Roof pitch",
            title: `Roof pitch ${pitchText}`,
            summary: `${pitchText} = ${fmt(r.angleDeg, 1)}°, multiplier ${fmt(r.factor, 3)}${v.span > 0 ? `; rafter ${formatFeetInches(r.rafterFt)} for a ${formatFeetInches(v.span)} span` : ""}`,
            items: [],
          })}
        />
      }
    />
  );
}
