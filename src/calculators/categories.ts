import type { Category, CategorySlug } from "./types";

export const CATEGORIES: Category[] = [
  {
    slug: "measure",
    name: "Area & Volume",
    short: "Measure",
    blurb: "Square feet, cubic yards and tons — the conversions every order starts with.",
    h1: "Area, Volume & Weight Calculators",
    metaTitle: "Square Footage, Cubic Yard & Ton Calculators",
    metaDescription:
      "Convert room and yard measurements into square feet, cubic yards and tons, the units contractors, lumber yards and quarries actually price in.",
    intro:
      "Nearly every material order starts with one of three numbers: square feet of surface, cubic yards of volume, or tons on the scale. These tools turn tape-measure readings — including L-shapes, circles and odd units — into those numbers, and show the weight that goes with them so you can check what a truck or trailer can carry.",
  },
  {
    slug: "concrete",
    name: "Concrete & Masonry",
    short: "Concrete",
    blurb: "Slabs, footings, blocks, bricks, mortar and rebar — bags, yards and pieces.",
    h1: "Concrete & Masonry Calculators",
    metaTitle: "Concrete & Masonry Calculators: Bags & Blocks",
    metaDescription:
      "Work out bags of concrete or yards of ready-mix, concrete blocks, bricks, mortar and rebar for slabs, footings, walls, posts and steps — with waste and cost.",
    intro:
      "Concrete is sold two ways: bags you mix yourself, or ready-mix delivered by the cubic yard. Masonry is counted by the piece and laid in mortar sold by the bag. These calculators give you every unit for the exact shape you are building, add a sensible overage, and show when a truck becomes cheaper than a pile of bags.",
  },
  {
    slug: "lumber",
    name: "Lumber, Decks & Stairs",
    short: "Lumber",
    blurb: "Board feet, studs, plywood sheets, deck boards, stair stringers and balusters.",
    h1: "Lumber, Deck & Stair Calculators",
    metaTitle: "Lumber, Deck & Stair Calculators",
    metaDescription:
      "Count studs, plywood sheets, deck boards, joists, stair stringers and balusters, and price lumber by the board foot, using the spans and spacing building codes require.",
    intro:
      "Lumber is priced three ways — by the piece, by the sheet and by the board foot — and framed to spacing rules set by the building code. These calculators turn a wall length, deck size or floor-to-floor height into the pieces you carry out of the yard, with the code limits for each layout shown alongside.",
  },
  {
    slug: "walls",
    name: "Drywall & Insulation",
    short: "Walls",
    blurb: "Drywall sheets, mud and tape, batt and blown-in insulation by R-value.",
    h1: "Drywall & Insulation Calculators",
    metaTitle: "Drywall & Insulation Calculators: Sheets & R-Value",
    metaDescription:
      "Calculate drywall sheets, joint compound, tape and screws, plus insulation batts or blown-in bags for the R-value your climate zone calls for.",
    intro:
      "Walls and attics are bought by the sheet, the bag and the R-value. These calculators start from the coverage charts drywall and insulation makers publish and the R-values the Department of Energy recommends by climate zone, so you buy the right count the first time.",
  },
  {
    slug: "landscaping",
    name: "Gravel, Sand & Mulch",
    short: "Landscaping",
    blurb: "Gravel, sand, topsoil, mulch and paver base — tons, yards or bags.",
    h1: "Gravel, Sand, Soil & Mulch Calculators",
    metaTitle: "Gravel, Mulch, Sand & Topsoil Calculators",
    metaDescription:
      "Find how many cubic yards, tons or bags of gravel, mulch, sand, topsoil or paver base you need, using real material densities and bag sizes.",
    intro:
      "Bulk materials are priced by the cubic yard or the ton, and bagged by the cubic foot — so the same driveway can be described three different ways. Enter your area and depth once and get every unit side by side, using the weight of the specific material you are buying.",
  },
  {
    slug: "paint",
    name: "Paint & Stain",
    short: "Paint",
    blurb: "Rooms, ceilings, trim, exterior siding, decks and fences.",
    h1: "Paint & Stain Calculators",
    metaTitle: "Paint Calculators: Gallons for Rooms & Exteriors",
    metaDescription:
      "Calculate gallons of paint, primer or stain for a room, ceiling, exterior or deck — with real coverage rates by product, coats and openings deducted.",
    intro:
      "Paint coverage depends on the product, the surface and how many coats you need. These calculators start from the coverage manufacturers actually publish, subtract doors and windows, and round to the cans you can buy so you are not left a quart short.",
  },
  {
    slug: "flooring",
    name: "Flooring",
    short: "Flooring",
    blurb: "Vinyl plank, laminate, hardwood and carpet — boxes, rolls and trim.",
    h1: "Flooring Calculators",
    metaTitle: "Flooring Calculators: Boxes, Waste & Cost",
    metaDescription:
      "Figure out boxes of vinyl plank, laminate or hardwood, carpet yardage, underlayment and trim for any room, with the right waste factor for your layout.",
    intro:
      "Flooring is sold by the box or the roll, not by the exact square foot, and the waste you need depends on the layout you choose. Measure each room once and get boxes, underlayment, baseboard and transition pieces in one shopping list.",
  },
  {
    slug: "tile",
    name: "Tile",
    short: "Tile",
    blurb: "Tile count, thinset, grout, backer board and waterproofing.",
    h1: "Tile Calculators",
    metaTitle: "Tile Calculators: Tiles, Thinset, Grout & Backer",
    metaDescription:
      "Calculate tiles, boxes, thinset bags, grout and backer board for floors, showers and backsplashes using manufacturer coverage charts.",
    intro:
      "A tile job needs more than tile: mortar, grout, backer board and often a waterproofing membrane, each with its own coverage chart. These calculators use the published numbers for each product type so the setting materials come out right the first time.",
  },
  {
    slug: "fence",
    name: "Fencing",
    short: "Fence",
    blurb: "Posts, panels, pickets, rails and concrete for any fence line.",
    h1: "Fence Calculators",
    metaTitle: "Fence Calculators: Posts, Pickets & Cost",
    metaDescription:
      "Calculate posts, pickets, panels, rails, concrete and cost for wood privacy, picket, vinyl or chain-link fences of any length.",
    intro:
      "Every fence comes down to the same count: how many posts, how many sections, and what fills them. Enter your fence line and gates and get a complete materials list — including the concrete for each post.",
  },
  {
    slug: "roofing",
    name: "Roofing & Siding",
    short: "Roofing",
    blurb: "Shingle bundles, roof pitch, siding squares and gutters.",
    h1: "Roofing & Siding Calculators",
    metaTitle: "Roofing & Siding Calculators: Squares & Bundles",
    metaDescription:
      "Convert your footprint and pitch into roofing squares, shingle bundles and underlayment, and your walls into siding squares, trim and gutter runs.",
    intro:
      "Roofers price and order in squares — 100 square feet of roof surface — and the pitch of your roof changes how many you need. Start from the house footprint and pitch and get bundles, starter, ridge cap and underlayment counts in one place.",
  },
  {
    slug: "electricity",
    name: "Electricity Cost",
    short: "Electricity",
    blurb: "What any appliance costs to run, per hour to per year, by state.",
    h1: "Electricity Cost Calculators",
    metaTitle: "Electricity Cost Calculators by Appliance & State",
    metaDescription:
      "See what a space heater, AC, refrigerator, EV or any appliance costs to run per hour, day, month and year at your state's current electricity rate.",
    intro:
      "Your electricity bill is just watts times hours times your rate. These calculators use typical wattage and real-world duty cycles for each appliance and the latest average residential price for every state from the U.S. Energy Information Administration.",
  },
  {
    slug: "solar",
    name: "Solar",
    short: "Solar",
    blurb: "System size, production, cost and payback for every state.",
    h1: "Solar Calculators",
    metaTitle: "Solar Calculators: Size, Savings & Payback by State",
    metaDescription:
      "Estimate solar system size, yearly production, installed cost and payback period for your state using NREL sun data and current incentives.",
    intro:
      "Whether solar pays off depends on three local numbers: how much sun you get, what you pay for electricity, and what your utility credits you for exports. These calculators combine all three for your state, with incentive rules as they stand today.",
  },
];

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as CategorySlug[];
