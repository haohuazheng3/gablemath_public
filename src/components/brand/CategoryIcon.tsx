/** Hand-drawn-feeling line icons for each category (24px grid, 1.8 stroke). */
export function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
  switch (slug) {
    case "measure": // tape measure
      return (
        <svg {...common}>
          <path d="M3 8.5a6 6 0 0 1 6-5.5h0a6 6 0 0 1 0 12H3z" />
          <circle cx="9" cy="9" r="2" />
          <path d="M9 15h12v5H9M13 15v2.2M16.5 15v2.2M20 15v2.2" />
        </svg>
      );
    case "lumber": // stacked boards
      return (
        <svg {...common}>
          <path d="M3 7h15l3 2.5-3 2.5H3zM3 14h15l3 2.5-3 2.5H3z" />
          <path d="M6.5 9.5h6M8 16.5h7" />
        </svg>
      );
    case "walls": // wall framing + panel
      return (
        <svg {...common}>
          <path d="M3 4h18v16H3zM3 8h18M8 8v12M13.5 8v12" />
          <path d="M16.5 11.5c1 .8 1 1.7 0 2.5s-1 1.7 0 2.5" />
        </svg>
      );
    case "concrete": // bag
      return (
        <svg {...common}>
          <path d="M6 4h12l1.5 3-1 13a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1l-1-13z" />
          <path d="M4.5 7h15M9 12h6M9 15.5h4" />
        </svg>
      );
    case "landscaping": // pile + shovel
      return (
        <svg {...common}>
          <path d="M2.5 19c2.2-4.6 5-7 8-7s5.8 2.4 8 7z" />
          <path d="M16 3l4 4M18 5l-5.5 5.5" />
          <circle cx="8" cy="16" r=".6" fill="currentColor" />
          <circle cx="12" cy="15" r=".6" fill="currentColor" />
        </svg>
      );
    case "paint": // roller
      return (
        <svg {...common}>
          <rect x="3" y="3.5" width="15" height="5" rx="1.5" />
          <path d="M18 6h2.5v5H11v3" />
          <rect x="9.5" y="14" width="3" height="7" rx="1" />
        </svg>
      );
    case "flooring": // planks
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="16" rx="1.5" />
          <path d="M3 9.3h18M3 14.7h18M10 4v5.3M15 9.3v5.4M7 14.7V20M17 14.7V20" />
        </svg>
      );
    case "tile": // tile grid
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1" />
          <rect x="13" y="3.5" width="7.5" height="7.5" rx="1" />
          <rect x="3.5" y="13" width="7.5" height="7.5" rx="1" />
          <rect x="13" y="13" width="7.5" height="7.5" rx="1" />
        </svg>
      );
    case "fence":
      return (
        <svg {...common}>
          <path d="M3 21V7l2-3 2 3v14M10 21V7l2-3 2 3v14M17 21V7l2-3 2 3v14" />
          <path d="M1.5 10.5h21M1.5 16.5h21" />
        </svg>
      );
    case "roofing": // gable roof with shingles
      return (
        <svg {...common}>
          <path d="M2.5 12 12 4l9.5 8" />
          <path d="M5.5 10v10h13V10M8 14h8M8 17h8" />
        </svg>
      );
    case "electricity": // plug bolt
      return (
        <svg {...common}>
          <path d="M13 2 5 13.5h6L10 22l9-12.5h-6z" />
        </svg>
      );
    case "solar":
      return (
        <svg {...common}>
          <path d="M3.5 20h17l-2.5-9H6z" />
          <path d="M12 11v9M4.8 15.5h14.4M9 11l-1 9M15 11l1 9" />
          <circle cx="18" cy="4.5" r="2" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2" />
        </svg>
      );
  }
}
