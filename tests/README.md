# tests

- `setup.ts`: shared Vitest setup (jest-dom matchers, cleanup, jsdom shims)
- `unit/`: Vitest + React Testing Library tests, run with `npm run test-unit` and by the CI `unit` job
  - `listing.test.ts`: filter/sort rules
  - `catalog.test.ts`: data access, relationships, display strings, every filter and sort key
  - `routes.test.tsx`: all 14 URLs and the redirects
  - `shell.test.tsx`: navbar links, active section, mobile menu, skip link, one `main` and `h1` per page, footer links
  - `components.test.tsx`: cards, listing controls, related cards
  - `VaccinesPage.test.tsx`: Vaccines listing header, cards and filtering
  - `VaccineDetailPage.test.tsx`: provider note, five facts, photo and video, related cards, CDC links and sources
  - `validate-data.test.ts`: fixture integrity rules in `scripts/lib/dataValidation.ts` (also run on the real files by `npm run validate-data` in the CI `check` job)
- `acceptance/`: Playwright browser tests, run with `npm run test-acceptance` (it builds the site and serves it with `vite preview`) and by the CI `acceptance` job. Run `npx playwright install` once first. The full suite runs in Chromium; tests tagged `@smoke` also run in Firefox and WebKit.
  - `pages.ts`: the 14 pages and their headings
  - `routes.spec.ts`: direct navigation and refresh on all 14 URLs, unknown path/ID redirects
  - `links.spec.ts`: crawls every internal link on all 14 pages and fails on any redirect or extra page
  - `listings.spec.ts`: cards, decoded unique photos, sorting, filtering, zero matches and Clear filters on each listing
  - `vaccine-details.spec.ts`: photo decodes and the APH video embeds on all three Vaccine pages
  - `responsive.spec.ts`: 1/2/3 card columns on phone/tablet/desktop, no horizontal overflow
  - `shell.spec.ts`: mobile menu button, desktop navigation and the skip link
- `test-owners.json`: maps each unit-test file (not the acceptance specs, which are not unit tests) to the GitLab username of the member who wrote it. The About page's per-member unit-test counts depend on it, so **add every new test file**.

## Still to do

- Tests for each page and component as it is built (all page owners)
- Statistics tests (Enzo, #35)
- Acceptance tests for the Home, detail and About pages as they are built (page owners)
