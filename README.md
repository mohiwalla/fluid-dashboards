# fluid dashboards

A dense, dark, keyboard-first dashboard starter: Turbo monorepo, Vite + React 19, shadcn/ui ([Base UI](https://base-ui.com), `base-nova` style, Tailwind v4) and [UI SDK](https://ui-sdk.dev) for custom behaviors.

| Page | Path | What it shows |
| --- | --- | --- |
| Overview | `/` | KPI tiles, revenue chart (monotone 4px line, rAF scrubbing, ←/→ inspection, live updates, projection), channel meters |
| Customers | `/customers` | TanStack Table v9: search (`/`, `?q=` in the URL), status and plan filters, sorting, selection, pagination, row menu, confirmed archive with undo |
| Settings | `/settings` | Profile form with inline and server errors, density and notification preferences, copy-in-place key, confirmed reset |

All data is generated locally (`apps/web/src/lib/data.ts`); the "API" is an in-memory mock with latency, so busy states are real and nothing leaves the browser.

## Run

Requires Node 20.19+ and npm.

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # typecheck + production build (turbo)
npm run lint
npm run typecheck
npx playwright install chromium   # once
npm test             # Playwright end-to-end suite
```

## Layout

```
apps/web            Vite app: routes, pages, app components, e2e tests
packages/ui         shared shadcn components and the global theme (globals.css)
```

Add shadcn components from `apps/web`: `npx shadcn@latest add <name>`. They land in `packages/ui/src/components` and use Base UI (`@base-ui/react`); compose triggers with `render={<Button />}`, not `asChild`.

## Where UI SDK is used

- **Command palette** (`⌘K` / `Ctrl+K`): `Dialog` + `Command` for focus, filtering, `aria-activedescendant` and the global shortcut.
- **Segmented controls** (range, status, density): one tab stop, arrow keys, sliding indicator.
- **Shortcuts**: `useShortcut` for `/` (search) and `?` (help), scoped `Escape` to clear search, and `shortcuts.list()` to build the help dialog.
- **Meter**: channel share bars with correct meter semantics.

shadcn on Base UI covers the rest: buttons, inputs, select, menus, alert dialogs, switches, table and Sonner toasts.

## Design rules

- shadcn v4 neutral, dark only: `#0a0a0a` page, `#101010` cards, 1px borders. Color belongs to data.
- Geist for UI, Geist Mono for numbers. 14/20 base, 36px controls, 32px small.
- Spacing (from prox / high-quality-leads): 24px page padding (16px on phones), 256px sidebar with 8px padding and 32px items, 16px between cards. Wide cards pad 16px top/bottom and 24px at the sides (12/16px on phones); narrow tiles pad evenly. List rows are at least 56px with 16/20px padding; table rows inset 16px; settings sections sit 32px apart with the heading above the card.
- Every control works from the keyboard with a visible focus ring; dialogs return focus.
- View choices (range, filters, density, toggles) persist in `localStorage` and are validated on restore.
- Fluid grids (`auto-fit` / `minmax`), no horizontal page scroll at 390px, `prefers-reduced-motion` respected.

## Tests

`apps/web/e2e/app.spec.ts` covers clean URLs and back/forward, the palette, chart keyboard inspection, persisted choices, table search/filter/sort, the archive flow (confirm, busy, removal), the plan select and row selection, form validation and server errors, density, shortcut help with focus return, 390px overflow on every page and reduced motion. A route guard fails any test that makes a non-localhost request.
