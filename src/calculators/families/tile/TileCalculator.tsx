"use client";

import { useMemo } from "react";
import { ActionBar } from "@/components/calc/ActionBar";
import { CalcFrame } from "@/components/calc/CalcFrame";
import { CostLines, type CostLine } from "@/components/calc/CostLines";
import { FieldSection, LengthField, NumberField, Segmented, SelectField, ToggleField } from "@/components/calc/fields";
import type { ShoppingItem } from "@/components/calc/projects";
import { Callout, OptionTable, ResultHero, ResultsHeading, StatGrid } from "@/components/calc/results";
import { ShoppingList } from "@/components/calc/ShoppingList";
import { useCalcState } from "@/components/calc/useCalcState";
import { useUnits } from "@/components/calc/units-context";
import { fmt, fmtInt, fmtMoney } from "@/lib/format";
import { SQFT_PER_SQM } from "@/lib/units";
import { autoGrout, autoMortar, autoTrowel, computeTile, describePlan, tileDims } from "./compute";
import { BACKERS, PATTERNS, TILE_FORMATS, TROWEL_PRICE, WASTE_RULES, WATERPROOF_OPTIONS, grout, mortar, trowel, type ProjectId } from "./data";
import { ChipPicker, GroutSelect, JointPicker, MoreOptions, MortarSelect, TileSizePicker, TrowelSelect, jointLabel } from "./parts";
import { PROJECT_SETUP, TILE_DEFAULTS, sizeValues, tileInputFrom, type TileValues } from "./tile-model";

const CALC_KEY = "tile/tile-calculator";

export default function TileCalculator({ initial }: { initial?: Partial<TileValues> }) {
  const { values: v, set, reset, shareUrl } = useCalcState(CALC_KEY, TILE_DEFAULTS, initial);
  const { system } = useUnits();
  const metric = system === "metric";
  const input = useMemo(() => tileInputFrom(v), [v]);
  const r = useMemo(() => computeTile(input), [input]);
  const setup = PROJECT_SETUP[input.project];
  const isFloor = input.project === "floor";
  const unit = r.dims.sheet ? "sheets" : "boxes";
  const f = r.dims.format;
  const sq = (n: number) => (metric ? `${fmt(n / SQFT_PER_SQM, 1)} m²` : `${fmt(n, 1)} sq ft`);
  const autoDims = tileDims(v.size, input.custom, v.chip);

  const others = useMemo(
    () =>
      TILE_FORMATS.filter((x) => x.id !== "custom" && (!x.wallOnly || !isFloor)).map((x) => {
        const o = computeTile({ ...input, sizeId: x.id, jointIn: x.jointIn, price: x.price, wastePct: null });
        return { f: x, o };
      }),
    [input, isFloor],
  );

  const t = r.thinset;
  const g = r.grout;
  const groutAmount = g.lb != null ? `${fmt(g.lb, 1)} lb` : `${fmt(g.volWithExtraIn3, 0)} in³`;

  const items: ShoppingItem[] = [
    { id: "tile", name: `${f.label} ${f.sub} tile${f.id === "custom" ? ` (${fmt(r.dims.longIn)} × ${fmt(r.dims.shortIn)} in)` : ""}`, qty: r.tiles.boxes, unit, cost: r.tileCost, note: `${fmtInt(r.tiles.pieces + r.tiles.attic)} pieces incl. ${fmt(r.waste, 0)}% waste${r.tiles.attic ? " + attic stock" : ""}` },
    { id: "thinset", name: `${t.mortar.short} thinset, ${t.mortar.size} ${t.mortar.unit}`, qty: t.bags, unit: t.mortar.unit === "gal" ? "pails" : "bags", cost: t.cost ?? undefined, note: `${trowel(r.trowelId).label}${r.backButter ? ", back-buttered" : ""}` },
    ...g.plan.lines.map((l) => ({ id: `grout-${l.pack.amount}`, name: `${g.grout.short} grout — ${l.pack.label}`, qty: l.count, unit: "units", cost: l.pack.price != null ? l.count * l.pack.price : undefined })),
    ...(r.backer
      ? [
          { id: "backer", name: `${r.backer.backer.name}, ${r.backer.backer.wFt}×${r.backer.backer.lFt} ft`, qty: r.backer.sheets, unit: "sheets", cost: r.backer.sheetCost ?? undefined },
          ...r.backer.fastenerPlan.lines.map((l) => ({ id: `screws-${l.pack.amount}`, name: `Backer fasteners — ${l.pack.label}`, qty: l.count, unit: "boxes", cost: l.pack.price != null ? l.count * l.pack.price : undefined })),
          ...(r.backer.tapeFt ? r.backer.tapePlan.lines.map((l) => ({ id: `tape-${l.pack.amount}`, name: `2 in alkali-resistant mesh tape — ${l.pack.label}`, qty: l.count, unit: "rolls", cost: l.pack.price != null ? l.count * l.pack.price : undefined })) : []),
          ...(r.backer.under ? [{ id: "under", name: "Modified thinset under the board (1/4 in square notch)", qty: r.backer.under.bags, unit: "bags", cost: r.backer.under.cost ?? undefined }] : []),
        ]
      : []),
    ...(r.wp
      ? [
          ...r.wp.plan.lines.map((l) => ({ id: `wp-${l.pack.amount}`, name: `${r.wp!.name} — ${l.pack.label}`, qty: l.count, unit: r.wp!.id === "kerdi" ? "rolls" : "pails", cost: l.pack.price != null ? l.count * l.pack.price : undefined })),
          ...(r.wp.bondBags ? [{ id: "allset", name: "Schluter ALL-SET (to bond KERDI)", qty: r.wp.bondBags, unit: "bags", cost: r.wp.bondCost }] : []),
        ]
      : []),
    { id: "trowel", name: `Notched trowel, ${trowel(r.trowelId).label}`, qty: 1, unit: "each", cost: TROWEL_PRICE },
    { id: "spacers", name: `Tile spacers, ${jointLabel(v.joint)}`, qty: r.tiles.pieces, unit: "pcs", note: "about one per tile" },
  ];

  const costLines: CostLine[] = [
    { priceId: `tile-${f.id}-box`, label: `${f.label} tile`, qty: r.tiles.boxes, unit, defaultPrice: Math.round(r.perBox * 100) / 100, note: f.priceUnit === "piece" && f.id !== "custom" ? `$${fmt(f.price)} per ${r.dims.sheet ? "sheet" : "piece"}` : `$${fmt(f.price)}/sq ft × ${fmt(r.tiles.boxSqFt, 2)} sq ft per box` },
    ...(t.mortar.price != null ? [{ priceId: `tile-mortar-${t.mortar.id}`, label: t.mortar.short, qty: t.bags, unit: t.mortar.unit === "gal" ? "pails" : "bags", defaultPrice: t.mortar.price }] : []),
    ...g.plan.lines.filter((l) => l.pack.price != null).map((l) => ({ priceId: `tile-grout-${g.grout.id}-${l.pack.amount}`, label: `${g.grout.short} ${l.pack.label}`, qty: l.count, unit: "units", defaultPrice: l.pack.price! })),
    ...(r.backer && r.backer.backer.price != null ? [{ priceId: `tile-backer-${r.backer.backer.id}`, label: r.backer.backer.short, qty: r.backer.sheets, unit: "sheets", defaultPrice: r.backer.backer.price }] : []),
    ...(r.backer ? r.backer.fastenerPlan.lines.filter((l) => l.pack.price != null).map((l) => ({ priceId: `tile-screws-${l.pack.amount}`, label: `Screws, ${l.pack.label}`, qty: l.count, unit: "boxes", defaultPrice: l.pack.price! })) : []),
    ...(r.backer ? r.backer.tapePlan.lines.filter((l) => l.pack.price != null).map((l) => ({ priceId: `tile-tape-${l.pack.amount}`, label: `Mesh tape, ${l.pack.label}`, qty: l.count, unit: "rolls", defaultPrice: l.pack.price! })) : []),
    ...(r.backer?.under ? [{ priceId: "tile-mortar-basic-under", label: "Thinset under board", qty: r.backer.under.bags, unit: "bags", defaultPrice: mortar("basic").price! }] : []),
    ...(r.wp ? r.wp.plan.lines.filter((l) => l.pack.price != null).map((l) => ({ priceId: `tile-wp-${r.wp!.id}-${l.pack.amount}`, label: `${r.wp!.name} ${l.pack.label}`, qty: l.count, unit: r.wp!.id === "kerdi" ? "rolls" : "pails", defaultPrice: l.pack.price! })) : []),
    { priceId: "tile-trowel", label: "Notched trowel", qty: 1, unit: "each", defaultPrice: TROWEL_PRICE },
  ];

  const title = `${setup.label}: ${fmt(r.area.net, 1)} sq ft of ${f.label} tile`;
  const label = (k: number) => (isFloor ? (k === 1 ? "Floor" : `Area ${k}`) : `${setup.surface} ${k}`);

  return (
    <CalcFrame
      dock={{ label: "You need", value: `${fmtInt(r.tiles.boxes)} ${unit} · ${fmtInt(r.tiles.pieces)} tiles` }}
      inputs={
        <>
          <FieldSection title="What are you tiling?">
            <Segmented
              label="Project"
              columns={2}
              value={v.project}
              options={(Object.keys(PROJECT_SETUP) as ProjectId[]).map((id) => ({ value: id as string, label: PROJECT_SETUP[id].label }))}
              onChange={(project) => {
                const s = PROJECT_SETUP[project as ProjectId];
                set({ project, backer: s.backer, wp: s.wp });
              }}
              help={setup.note}
            />
          </FieldSection>

          <FieldSection title="Surfaces">
            {[1, 2, 3, 4].slice(0, Math.max(1, v.n)).map((k) => {
              const lk = `l${k}` as "l1";
              const wk = `w${k}` as "w1";
              return (
                <div key={k} className={k > 1 ? "animate-rise rounded-[16px] border border-line bg-surface-2 p-3" : ""}>
                  {k > 1 ? (
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[0.8rem] font-semibold text-ink-2">{label(k)}</span>
                      <button type="button" onClick={() => set({ n: k - 1 })} className="rounded-full px-2 py-0.5 text-[0.76rem] font-semibold text-ink-3 hover:text-bad">
                        Remove
                      </button>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-3">
                    <LengthField label={isFloor ? "Length" : input.project === "backsplash" ? "Length" : "Width"} value={v[lk]} onChange={(x) => set({ [lk]: x })} />
                    <LengthField label={isFloor ? "Width" : "Height"} value={v[wk]} onChange={(x) => set({ [wk]: x })} />
                  </div>
                </div>
              );
            })}
            {[1, 2].slice(0, v.o).map((k) => {
              const wk = `ow${k}` as "ow1";
              const hk = `oh${k}` as "oh1";
              return (
                <div key={`o${k}`} className="animate-rise rounded-[16px] border border-dashed border-line-strong bg-surface-2 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[0.8rem] font-semibold text-ink-2">Subtract opening {k}</span>
                    <button type="button" onClick={() => set({ o: k - 1 })} className="rounded-full px-2 py-0.5 text-[0.76rem] font-semibold text-ink-3 hover:text-bad">
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <LengthField label="Width" value={v[wk]} onChange={(x) => set({ [wk]: x })} />
                    <LengthField label={isFloor ? "Depth" : "Height"} value={v[hk]} onChange={(x) => set({ [hk]: x })} />
                  </div>
                </div>
              );
            })}
            <div className="grid grid-cols-2 gap-2">
              {v.n < 4 ? (
                <button type="button" onClick={() => set({ n: v.n + 1 })} className="flex h-11 items-center justify-center rounded-[14px] border border-dashed border-line-strong text-[0.84rem] font-semibold text-ink-2 transition hover:border-accent hover:text-accent active:scale-[0.98]">
                  + {isFloor ? "Area (L-shape)" : setup.surface.toLowerCase()}
                </button>
              ) : null}
              {v.o < 2 ? (
                <button type="button" onClick={() => set({ o: v.o + 1 })} className="flex h-11 items-center justify-center rounded-[14px] border border-dashed border-line-strong text-[0.84rem] font-semibold text-ink-2 transition hover:border-accent hover:text-accent active:scale-[0.98]">
                  − {isFloor ? "Vanity / tub" : "Window / door"}
                </button>
              ) : null}
            </div>
          </FieldSection>

          <FieldSection title="Tile">
            <TileSizePicker value={v.size} onChange={(id) => set(sizeValues(id))} help={f.basis} />
            {r.dims.sheet ? <ChipPicker value={v.chip} onChange={(chip) => set({ chip })} /> : null}
            {f.id === "custom" ? (
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Actual length" value={v.cl} onChange={(cl) => set({ cl })} suffix="in" step={0.25} min={1} max={96} decimals={2} />
                <NumberField label="Actual width" value={v.cw} onChange={(cw) => set({ cw })} suffix="in" step={0.25} min={1} max={96} decimals={2} />
                <NumberField label="Pieces per box" value={v.cpcs} onChange={(cpcs) => set({ cpcs: Math.max(1, Math.round(cpcs)) })} step={1} min={1} max={500} decimals={0} />
                <NumberField label="Thickness" value={v.ct} onChange={(ct) => set({ ct })} suffix="in" step={0.0625} min={0.1} max={1.5} decimals={3} />
              </div>
            ) : null}
            <JointPicker value={v.joint} onChange={(joint) => set({ joint })} />
            <Segmented label="Layout" columns={3} value={v.pattern} options={PATTERNS.map((p) => ({ value: p.id as string, label: p.label, sub: `${p.waste}%` }))} onChange={(pattern) => set({ pattern })} />
          </FieldSection>

          <MoreOptions label="Waste, thinset, grout, backer & membrane">
            <NumberField
              label="Extra for cuts & breakage"
              value={r.waste}
              onChange={(waste) => set({ waste })}
              suffix="%"
              step={1}
              min={0}
              max={40}
              decimals={0}
              help={v.waste > 0 ? <button type="button" className="font-semibold text-accent" onClick={() => set({ waste: 0 })}>Use the recommended amount</button> : `Recommended for ${f.label} in this layout${r.area.net < WASTE_RULES.smallRoomSqFt && r.area.net > 0 ? " (+5% for a small room)" : ""}.`}
            />
            <ToggleField label="Add 10% attic stock" checked={v.attic} onChange={(attic) => set({ attic })} help="Daltile suggests keeping about 10% from the same lot for future repairs — dye lots change." />
            <TrowelSelect value={v.trowel} onChange={(trowel) => set({ trowel })} autoLabel={trowel(autoTrowel(autoDims)).label} />
            <MortarSelect value={v.mortar} onChange={(m) => set({ mortar: m })} autoLabel={mortar(autoMortar(autoDims)).short} />
            <GroutSelect value={v.grout} onChange={(gr) => set({ grout: gr })} autoLabel={grout(autoGrout(v.joint)).short} />
            <SelectField label="Backer board" value={v.backer} onChange={(backer) => set({ backer })} options={[{ value: "none", label: "None (drywall or existing surface)" }, ...BACKERS.map((b) => ({ value: b.id, label: `${b.short} · ${b.wFt}×${b.lFt} ft`, group: b.kind === "cement" ? "Cement board" : "Foam board" }))]} />
            <SelectField label="Waterproofing" value={v.wp} onChange={(wp) => set({ wp })} options={[{ value: "none", label: "None" }, ...WATERPROOF_OPTIONS.map((o) => ({ value: o.id as string, label: o.label }))]} />
          </MoreOptions>
        </>
      }
      results={
        <>
          <ResultHero
            label="You need"
            value={fmtInt(r.tiles.boxes)}
            unit={`${unit} of ${f.label}`}
            sub={
              <>
                {fmtInt(r.tiles.pieces)} {r.dims.sheet ? "sheets" : "tiles"} for {sq(r.area.net)} incl. {fmt(r.waste, 0)}% extra
                {r.tiles.attic ? ` + ${fmtInt(r.tiles.attic)} attic stock` : ""} · {sq(r.tiles.sqftBought)} in the {unit}
              </>
            }
          />
          <StatGrid
            stats={[
              { label: "Area to tile", value: metric ? fmt(r.area.net / SQFT_PER_SQM, 2) : fmt(r.area.net, 1), unit: metric ? "m²" : "sq ft", hint: r.area.deduct ? `${fmt(r.area.gross, 1)} minus ${fmt(r.area.deduct, 1)} of openings` : undefined },
              { label: "Tile cost", value: fmtMoney(r.tileCost), hint: `about ${fmtMoney(r.perBox)} per ${r.dims.sheet ? "sheet" : "box"}` },
              { label: "Thinset", value: fmtInt(t.bags), unit: t.mortar.unit === "gal" ? "pails" : "bags", hint: `${t.mortar.short} · ${trowel(r.trowelId).short}` },
              { label: "Grout", value: groutAmount, hint: `${g.grout.short}: ${describePlan(g.plan)}` },
              ...(r.backer ? [{ label: "Backer board", value: fmtInt(r.backer.sheets), unit: "sheets", hint: `${r.backer.backer.short} · ${fmtInt(r.backer.fasteners)} fasteners` }] : []),
              ...(r.wp ? [{ label: "Waterproofing", value: fmt(r.wp.need, 1), unit: r.wp.unit, hint: `${r.wp.name}: ${describePlan(r.wp.plan)}` }] : []),
            ]}
          />

          {r.backButter ? (
            <Callout tone="tip" title="Back-butter large tile">
              Tile over 15 in needs a skim of thinset on its back as well as the troweled bed. That adds about {fmt(t.bbBags, 1)} bag here — already included. Lift a tile now and then to check you have {isFloor ? "80%" : "95%"} contact{isFloor ? " (95% in showers and outdoors)" : ""}.
            </Callout>
          ) : null}
          {t.basis !== "chart" ? (
            <Callout tone="info">
              {t.mortar.short} does not publish a {trowel(r.trowelId).label} rate; the {fmt(t.cov, 0)} sq ft per {t.mortar.unit === "gal" ? "pail" : "bag"} used here is {t.basis === "ratio" ? "scaled from its 1/4 in square-notch rate by bed depth" : "the conservative store-brand figure"} — an estimate.
            </Callout>
          ) : null}
          {r.warnings.map((w) => (
            <Callout key={w} tone="warn">
              {w}
            </Callout>
          ))}

          <ResultsHeading>Other tile sizes, same area</ResultsHeading>
          <OptionTable
            caption="Pieces and boxes by tile size (recommended waste, carton counts as listed)"
            columns={["Tile", "Pieces", "Boxes", "Tile cost"]}
            highlight={others.findIndex((x) => x.f.id === f.id)}
            rows={others.map(({ f: x, o }) => [`${x.label} ${x.sub}`, fmtInt(o.tiles.pieces), `${fmtInt(o.tiles.boxes)}${x.sheet ? " sheets" : ""}`, fmtMoney(o.tileCost)])}
          />

          <Callout tone="info" title="Hiring it out?">
            Installed tile runs about {fmtMoney(r.installed[0])}–{fmtMoney(r.installed[1])} for {fmt(r.area.net, 0)} sq ft ({input.project === "shower" ? "Fixr, 2025" : "homewyse, May 2026"}{v.pattern !== "straight" ? ", including the pattern premium" : ""}). Your materials above come to about {fmtMoney(r.materialCost)}.
          </Callout>

          <ShoppingList items={items} calcKey={CALC_KEY} />
          <CostLines lines={costLines} footnote="Typical U.S. prices (Floor & Decor and others) checked October 2026. Tap any price to enter your store's." />
        </>
      }
      footer={
        <ActionBar
          shareUrl={shareUrl}
          onReset={reset}
          payload={() => ({
            calcKey: CALC_KEY,
            calcName: "Tile",
            title,
            summary: `${fmtInt(r.tiles.boxes)} ${unit} (${fmtInt(r.tiles.pieces)} tiles), ${fmtInt(t.bags)} thinset, ${describePlan(g.plan)} grout`,
            items,
          })}
        />
      }
    />
  );
}
