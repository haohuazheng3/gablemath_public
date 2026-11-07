# GableMath

Free, source-checked calculators for home projects and energy costs — concrete, gravel and mulch, paint, flooring, tile,
fencing, roofing, appliance electricity cost by state, and solar savings. Live at **https://gablemath.com**.

- Quantities come from manufacturer technical data sheets (bag yields, coverage rates), not rules of thumb.
- Every result is given in the units you actually buy (bags, yards, tons, boxes, gallons) and rounded up to whole packages.
- Shopping lists, editable local prices, bag-vs-bulk comparisons and saved projects (stored in the browser, no account).
- Long-tail "quick answer" pages are rendered on the server from the same math the interactive calculator uses.

## Stack

Next.js 16 (App Router, static generation), React 19, Tailwind CSS 4, TypeScript, Drizzle ORM on Postgres (Neon) for
the contact form, feedback votes and a self-hosted error inbox, Vitest for unit tests.

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in what you need; content pages work without a database
npm run dev
```

Content pages and calculators need no configuration. The database-backed endpoints (contact form, feedback, error inbox,
health check) need a Postgres connection string in `.env.local`; then create the tables:

```bash
npm run db:migrate
```

## Scripts

| command | what it does |
|---|---|
| `npm run dev` | local dev server |
| `npm run build` | production build (all calculator pages are prerendered) |
| `npm test` | unit tests for every calculator's math |
| `npm run typecheck` / `npm run lint` | static checks |
| `npm run refresh:data` | refresh public datasets (e.g. state electricity prices) |

## Project layout

```
src/calculators/families/<family>/   data, pure math, tests, client calculator, page content, presets
src/components/calc/                 shared calculator UI (fields, results, shopping list, projects)
src/app/                             routes: hubs, calculators, quick-answer pages, blog, trust pages, API
src/lib/                             site config, SEO helpers, database, error capture
```

Every number in `data.ts` files cites its source; calculators display the date the data was last checked.

## Disclaimer

Results are planning estimates, not engineering, code or financial advice. Confirm quantities with your supplier and
structural, electrical or code questions with a licensed professional.
