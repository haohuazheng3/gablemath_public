import { clsx } from "clsx";

/**
 * The GableMath mark: a gable roof drawn over an equals sign.
 * "Home = math". Pure strokes, monochrome, readable at 16px.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={clsx("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="none"
      stroke="currentColor"
      strokeWidth={3.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.5 15.2 16 6.2l10.5 9" />
      <path d="M9.6 20.6h12.8M9.6 26h12.8" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={clsx("display text-[1.32rem] leading-none tracking-[-0.025em]", className)}>
      Gable<span className="text-ink-2">Math</span>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2", className)}>
      <span className="grid size-8 place-items-center rounded-[10px] bg-ink text-bg">
        <LogoMark className="size-[22px]" />
      </span>
      <Wordmark />
    </span>
  );
}
