// Maps a calculator's material takeoff onto the shared shopping-list and cost-line components.

import type { CostLine } from "@/components/calc/CostLines";
import type { ShoppingItem } from "@/components/calc/projects";
import type { MaterialLine } from "./compute";

export function shoppingItems(materials: MaterialLine[]): ShoppingItem[] {
  return materials.map((m) => ({
    id: m.id,
    name: m.name,
    qty: m.qty,
    unit: m.unit,
    note: [m.note, m.estimate].filter(Boolean).join(" · ") || undefined,
    cost: m.price != null ? m.price * m.qty : undefined,
  }));
}

export function costLines(materials: MaterialLine[]): CostLine[] {
  return materials
    .filter((m) => m.price != null && m.qty > 0)
    .map((m) => ({ priceId: m.id, label: m.name, qty: m.qty, unit: m.unit, defaultPrice: m.price!, note: m.estimate }));
}
