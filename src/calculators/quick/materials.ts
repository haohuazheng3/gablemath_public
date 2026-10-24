// Bulk material weights used by the area/volume/weight tools. Aggregate, soil, sand and mulch
// figures come straight from the landscaping family's source-checked data; concrete and asphalt
// are noted inline.

import { CONCRETE_LB_PER_CUFT } from "../families/concrete/data";
import { AGGREGATES, SAND_TONS_PER_YD, SOIL_TYPES } from "../families/landscaping/data";

export interface BulkMaterial {
  id: string;
  name: string;
  /** Loose, as-delivered short tons per cubic yard. */
  tonsPerYd: number;
  note: string;
}

const soil = (id: string) => SOIL_TYPES.find((s) => s.id === id)!;

export const BULK_MATERIALS: BulkMaterial[] = [
  ...AGGREGATES.map((a) => ({ id: a.id, name: a.name, tonsPerYd: a.tonsPerYd, note: a.densityNote })),
  { id: "sand", name: "Sand (bulk, damp)", tonsPerYd: SAND_TONS_PER_YD, note: "Vulcan 1.35–1.49, Martin Marietta 1.44–1.47 t/yd³" },
  { id: "topsoil", name: soil("topsoil").name, tonsPerYd: soil("topsoil").tonsPerYd, note: "Roseville Rock Supply 2,000–2,200 lb/yd³" },
  { id: "fill", name: soil("fill").name, tonsPerYd: soil("fill").tonsPerYd, note: "Planning figure; wet or clay-heavy fill runs heavier" },
  { id: "compost", name: soil("compost").name, tonsPerYd: soil("compost").tonsPerYd, note: "About 800–1,200 lb/yd³ depending on moisture" },
  { id: "mulch", name: "Wood mulch", tonsPerYd: 0.3, note: "Roseville Rock Supply ~600 lb/yd³" },
  { id: "concrete", name: "Concrete (placed)", tonsPerYd: (CONCRETE_LB_PER_CUFT * 27) / 2000, note: `${CONCRETE_LB_PER_CUFT} lb/ft³ normal-weight concrete` },
  { id: "asphalt", name: "Hot-mix asphalt (compacted)", tonsPerYd: 1.98, note: "110 lb per sq yd per inch (Asphalt Institute) = 3,960 lb/yd³" },
];

export function bulk(id: string): BulkMaterial {
  return BULK_MATERIALS.find((m) => m.id === id) ?? BULK_MATERIALS[0];
}

export const BULK_OPTIONS = BULK_MATERIALS.map((m) => ({ value: m.id, label: m.name }));
