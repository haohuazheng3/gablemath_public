import QuickCalc from "@/components/calc/QuickCalc";
import type { CalculatorEntry } from "../types";
import { calcKey } from "../types";
import { quickPages } from "./content";
import { QUICK_DEFS } from "./defs";

// A quick tool is published when both its definition (defs.ts) and its page (content/tools) exist.
export const calculators: CalculatorEntry[] = quickPages()
  .filter((p) => QUICK_DEFS[calcKey(p.meta)])
  .map(({ meta, html }) => {
    const key = calcKey(meta);
    function Calculator({ initial }: { initial?: Record<string, unknown> }) {
      return <QuickCalc toolKey={key} initial={initial as never} />;
    }
    function Content() {
      return <div dangerouslySetInnerHTML={{ __html: html }} />;
    }
    return { meta, Calculator, Content };
  });
