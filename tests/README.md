# tests

- `setup.ts`: shared Vitest setup (jest-dom matchers, cleanup, jsdom shims)
- `unit/`: Vitest + React Testing Library tests, run with `npm run test-unit` and by the CI `unit` job
  - `listing.test.ts`: filter/sort rules
  - `catalog.test.ts`: data access, relationships, display strings, every filter and sort key
  - `routes.test.tsx`: all 14 URLs and the redirects
  - `components.test.tsx`: cards, listing controls, related cards
- `test-owners.json`: maps each unit-test file to the GitLab username of the member who wrote it. The About page's per-member unit-test counts depend on it, so **add every new test file**.

## Still to do

- Tests for each page and component as it is built (all page owners)
- Data validation tests (Alex, #29) and statistics tests (Enzo, #35)
- `acceptance/`: Playwright browser tests (Alex, #30)
