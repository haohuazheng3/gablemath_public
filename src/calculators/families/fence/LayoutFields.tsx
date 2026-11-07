import { FieldSection, LengthField, NumberField, Segmented, SelectField } from "@/components/calc/fields";
import { fmt } from "@/lib/format";
import { FT_PER_M } from "@/lib/units";
import { DRIVE_GATE_WIDTHS_FT, WALK_GATE_WIDTHS_IN } from "./data";
import { MAX_RUNS, RUN_KEYS, runCount, type LayoutValues } from "./layout-model";

/** Sides, shape and gates — shared by the wood/vinyl and chain-link calculators. */
export function LayoutFields({
  v,
  set,
  walkHelp,
  metric,
}: {
  v: LayoutValues;
  set: (patch: Partial<LayoutValues>) => void;
  walkHelp: string;
  metric: boolean;
}) {
  const n = runCount(v);
  const total = RUN_KEYS.slice(0, n).reduce((s, k) => s + v[k], 0);
  const sides = Array.from({ length: n }, (_, i) => ({ value: String(i + 1), label: `Side ${i + 1}` }));

  return (
    <>
      <FieldSection title="Fence line" aside={<span className="num text-[0.78rem] font-semibold text-ink-3">{metric ? `${fmt(total / FT_PER_M, 1)} m` : `${fmt(total, 1)} ft`} total</span>}>
        <div className="grid grid-cols-2 gap-3">
          {RUN_KEYS.slice(0, n).map((k, i) => (
            <LengthField key={k} label={n === 1 ? "Fence length" : `Side ${i + 1}`} value={v[k]} onChange={(val) => set({ [k]: val })} hint={n > 1 && i > 0 ? "after a corner" : undefined} />
          ))}
        </div>
        <div className="flex gap-2">
          {n < MAX_RUNS ? (
            <button
              type="button"
              onClick={() => set({ runs: n + 1 })}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[14px] border border-dashed border-line-strong text-[0.86rem] font-semibold text-ink-2 transition hover:border-accent hover:text-accent active:scale-[0.99]"
            >
              + Add a side <span className="font-normal text-ink-3">(adds a corner)</span>
            </button>
          ) : null}
          {n > 1 ? (
            <button
              type="button"
              onClick={() => set({ runs: n - 1 })}
              className="h-11 rounded-[14px] px-4 text-[0.84rem] font-semibold text-ink-3 ring-1 ring-line transition hover:text-bad active:scale-[0.99]"
            >
              Remove side {n}
            </button>
          ) : null}
        </div>
        {n >= 3 ? (
          <Segmented
            label="Shape"
            value={v.loop ? "loop" : "open"}
            options={[
              { value: "open", label: "Open ends", sub: "e.g. meets the house" },
              { value: "loop", label: "Closed loop", sub: "fully enclosed" },
            ]}
            onChange={(s) => set({ loop: s === "loop" })}
            help={v.loop ? "Every side meets another at a corner post — no end posts." : "The first and last sides finish at end posts (next to the house, a wall or a neighbor's fence)."}
          />
        ) : null}
      </FieldSection>

      <FieldSection title="Gates">
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Walk gates" value={v.wg} onChange={(wg) => set({ wg: Math.round(wg) })} step={1} min={0} max={6} decimals={0} />
          <NumberField label="Double drive gates" value={v.dg} onChange={(dg) => set({ dg: Math.round(dg) })} step={1} min={0} max={3} decimals={0} />
        </div>
        {v.wg > 0 ? (
          <Segmented
            label="Walk gate opening"
            value={v.ww}
            options={WALK_GATE_WIDTHS_IN.map((w) => ({ value: w, label: `${w} in`, sub: `${fmt(w / 12, 1)} ft` }))}
            onChange={(ww) => set({ ww })}
            help={walkHelp}
          />
        ) : null}
        {v.dg > 0 ? (
          <Segmented
            label="Drive gate opening"
            value={v.dw}
            options={DRIVE_GATE_WIDTHS_FT.map((w) => ({ value: w, label: `${w} ft`, sub: "two leaves" }))}
            onChange={(dw) => set({ dw })}
          />
        ) : null}
        {n > 1 && v.wg + v.dg > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {v.wg > 0 ? <SelectField label="Walk gates on" value={String(Math.min(v.wgs, n))} onChange={(s) => set({ wgs: Number(s) })} options={sides} /> : null}
            {v.dg > 0 ? <SelectField label="Drive gates on" value={String(Math.min(v.dgs, n))} onChange={(s) => set({ dgs: Number(s) })} options={sides} /> : null}
          </div>
        ) : null}
      </FieldSection>
    </>
  );
}
