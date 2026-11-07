"use client";

import { clsx } from "clsx";
import { useState } from "react";
import { track } from "@/lib/analytics";
import { fmt, fmtMoney } from "@/lib/format";
import { itemsToText, type ShoppingItem } from "./projects";

/** Store-ready list with tick-off checkboxes and one-tap copy. */
export function ShoppingList({
  title = "Shopping list",
  items,
  calcKey,
}: {
  title?: string;
  items: ShoppingItem[];
  calcKey: string;
}) {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const total = items.reduce((s, i) => s + (i.cost ?? 0), 0);

  async function copy() {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
    try {
      await navigator.clipboard.writeText(itemsToText(title, items));
      track("shopping_list_copied", { calc: calcKey });
    } catch (err) {
      console.warn("[shopping-list] clipboard unavailable", err);
    }
  }

  if (!items.length) return null;
  return (
    <div className="rounded-[18px] border border-line bg-surface-2">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h3 className="text-[0.92rem] font-semibold text-ink">{title}</h3>
        <button
          type="button"
          onClick={copy}
          className={clsx(
            "rounded-full px-3 py-1.5 text-[0.78rem] font-semibold transition active:scale-95",
            copied ? "bg-ok-soft text-ok" : "bg-surface text-ink-2 ring-1 ring-line hover:text-ink",
          )}
        >
          {copied ? "Copied ✓" : "Copy list"}
        </button>
      </div>
      <ul className="divide-y divide-line">
        {items.map((it) => (
          <li key={it.id}>
            <label className="flex cursor-pointer items-start gap-3 px-4 py-3">
              <input
                type="checkbox"
                checked={!!done[it.id]}
                onChange={(e) => setDone((d) => ({ ...d, [it.id]: e.target.checked }))}
                className="mt-0.5 size-[18px] shrink-0 cursor-pointer accent-[var(--accent)]"
              />
              <span className={clsx("min-w-0 flex-1 text-[0.9rem] leading-snug", done[it.id] && "text-ink-3 line-through")}>
                <span className="num font-semibold text-ink">
                  {fmt(it.qty, 2)} {it.unit}
                </span>{" "}
                <span className="text-ink-2">{it.name}</span>
                {it.note ? <span className="block text-[0.76rem] text-ink-3">{it.note}</span> : null}
              </span>
              {it.cost != null ? <span className="num shrink-0 text-[0.86rem] text-ink-2">{fmtMoney(it.cost)}</span> : null}
            </label>
          </li>
        ))}
      </ul>
      {total > 0 ? (
        <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[0.9rem]">
          <span className="font-semibold text-ink">Estimated total</span>
          <span className="num font-semibold text-ink">{fmtMoney(total)}</span>
        </div>
      ) : null}
    </div>
  );
}
