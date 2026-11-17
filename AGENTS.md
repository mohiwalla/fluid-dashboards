# AGENTS.md

- Before using ui-sdk, read `node_modules/@ui-sdk/react/docs/llms.txt` and the page of each component you use (`node_modules/@ui-sdk/react/docs/components/*.md`). To build a new component, search `node_modules/@ui-sdk/react/docs/core.md` by heading.
- TanStack Table is v9 (`useTable`, `tableFeatures`). Read `node_modules/@tanstack/react-table/skills/` before changing the table.
- shadcn components live in `packages/ui`; add them from `apps/web` with `npx shadcn@latest add <name>`.
- Keep the design rules in README.md. Run `npm run lint`, `npm run build` and `npm test` before handing off.
