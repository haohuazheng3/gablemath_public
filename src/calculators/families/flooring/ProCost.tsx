// "Hire it out" card: labor lines plus an installed total that includes the visitor's own material
// prices. The framework's CostLines keeps edited prices inside its own hook, so the calculators wrap it
// in an element that bumps `rev` on any edit; remounting <Totals key={rev}> re-reads the saved prices
// through the same exported usePrices hook. Imported only by the client calculators.

import type { ReactNode } from "react";
import { usePrices, type CostLine } from "@/components/calc/CostLines";
import { fmtMoney } from "@/lib/format";

export interface LaborLine {
  label: string;
  detail: string;
  amount: number;
}

function Totals({ lines, labor }: { lines: CostLine[]; labor: number }) {
  const { total } = usePrices(lines);
  return (
    <dl className="grid grid-cols-3 gap-2 border-t border-line-strong px-4 py-3">
      <div>
        <dt className="text-[0.72rem] text-ink-3">Materials</dt>
        <dd className="num text-[0.95rem] font-semibold text-ink">{fmtMoney(total)}</dd>
      </div>
      <div>
        <dt className="text-[0.72rem] text-ink-3">Labor & extras</dt>
        <dd className="num text-[0.95rem] font-semibold text-ink">{fmtMoney(labor)}</dd>
      </div>
      <div className="text-right">
        <dt className="text-[0.72rem] text-ink-3">Installed total</dt>
        <dd className="num text-[1.1rem] font-semibold text-ink">{fmtMoney(total + labor)}</dd>
      </div>
    </dl>
  );
}

export function ProCost({
  rev,
  lines,
  labor,
  inputs,
  footnote,
}: {
  /** bump to re-read prices edited in the CostLines above */
  rev: number;
  lines: CostLine[];
  labor: LaborLine[];
  inputs: ReactNode;
  footnote: string;
}) {
  const laborTotal = labor.reduce((s, l) => s + l.amount, 0);
  return (
    <div className="rounded-[18px] border border-line">
      <div className="border-b border-line px-4 py-3">
        <h3 className="text-[0.92rem] font-semibold text-ink">Hiring a pro? Installed cost</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 px-4 py-3">{inputs}</div>
      <ul className="divide-y divide-line border-t border-line">
        {labor.map((l) => (
          <li key={l.label} className="flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-[0.88rem] font-medium leading-snug text-ink">{l.label}</div>
              <div className="num text-[0.76rem] text-ink-3">{l.detail}</div>
            </div>
            <div className="num shrink-0 text-[0.92rem] font-semibold text-ink">{fmtMoney(l.amount)}</div>
          </li>
        ))}
      </ul>
      <Totals key={rev} lines={lines} labor={laborTotal} />
      <p className="border-t border-line px-4 py-2.5 text-[0.74rem] leading-snug text-ink-3">{footnote}</p>
    </div>
  );
}
