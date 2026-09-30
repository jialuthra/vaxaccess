# Remaining Phase I Work

Due **Wednesday, September 30, 2026, 11:59 PM**. `#N` is the GitLab issue; section numbers refer to DESIGN.md.

## Already done (Luke)

The foundation is on `main`, so everyone can start building pages now:

- React + TypeScript + Vite project, `Makefile`, `.gitignore`, `amplify.yml`, GitLab CI (#6, #7, #8)
- Data types and seed data for all nine records and their links (#9)
- `catalog.ts` for reading data and `listing.ts` for filtering/sorting (#11, #12)
- All 14 routes with placeholder pages and redirects (#15)
- Reusable `ModelCard`, `ModelListing` (filters, sorting, result count) and `RelatedCards` (#16)
- 92 passing unit/component tests (#13, #24)

Run `npm ci`, then `npm run dev`. Before pushing, run `npm run lint`, `npm run typecheck` and `npm run test-unit`. Add every new test file to `tests/test-owners.json` under your GitLab username.

## Jia (Phase I leader)

- [ ] **#14 Shared shell**: build `src/components/Navbar.tsx`, `Footer.tsx` and `PageLayout.tsx`, then replace the temporary header in `src/App.tsx`. Include a collapsible mobile menu, active link, skip link and footer links (§4.2).
- [ ] **#23 Home page**: replace the placeholder in `src/pages/HomePage.tsx` with the hero photo, intro, link to current resources, and primary/secondary buttons (§4.2).
- [ ] **#42 Team profiles**: collect bios, photos and responsibilities and create `src/data/team.json` (use the `TeamMember` type in `src/types/domain.ts`). Enzo's About page reads this file.
- [ ] **#41 README**: required fields for each member (EID, GitLab ID, estimated/actual time, comments), plus the pipeline link, Git SHA, setup instructions and CI contract. Make it consistent with DESIGN.md.
- [ ] **#43 Time log**: `docs/time-log.md`. Make sure every issue is closed.
- [ ] **#44 Submission**: generate `IDB1.log.txt`, record the SHA, combine README + DESIGN into a PDF, submit to Canvas.
- [ ] **#45 DESIGN review** and **#46 rubric check**.

## Nifemi (repo owner)

- [x] **#10 Styles**: `src/styles/tokens.css` (all 55 palette colors), `global.css`, `components.css`; import them in `src/main.tsx` after Bootstrap (§4.3).
- [x] **#17 Sites listing**: in `src/pages/SitesPage.tsx`, add the explanation, the Austin Public Health current-resources link and `<ModelListing kind="sites" cards={getSiteCards()} />`. Keep the catalog summary line.
- [x] **#20 Site detail pages**: in `src/pages/SiteDetailPage.tsx`, add the historical status, fields, photo, OpenStreetMap embed, `RelatedCards` for vaccines and opportunities, sources and the "Find current vaccination services" link (§4.2, §4.8). Build `MediaBlock.tsx` and `SourceList.tsx` in a way Alex and Enzo can reuse.
- [x] **#36 Postman**: six requests, examples and test scripts exported to `postman/`.
- [ ] **#37 Publish Postman docs** and send the URL to Enzo for the About page (see `postman/README.md`).
- [ ] **#38, #39, #40 AWS** (runbook in `docs/deployment.md`): Amplify hosting (add the rewrite rule documented in `amplify.yml`), vaxaccess.me with HTTPS, and deployment of the statistics Lambda.

## Alex

- [ ] **#18 Vaccines listing**: `src/pages/VaccinesPage.tsx` with `<ModelListing kind="vaccines" cards={getVaccineCards()} />`.
- [ ] **#21 Vaccine detail pages**: `src/pages/VaccineDetailPage.tsx`, with the photo, YouTube embed (`getVideo(vaccine.videoId)`), related sites and opportunities, CDC sources and the provider note.
- [ ] **#25 Data collection**: `scripts/collect-data.ts` (install `tsx`). Fetch the HTML sources and the Census Geocoder; save the evidence to `data/raw/`.
- [ ] **#26, #27 Final data**: fill in coordinates, `retrievedAt`/`rawPath` on sources, and verify the clinical text in `src/data/`.
- [ ] **#28 Photos**: download the nine images to `public/images/`, and fill in `originalUrl`, `width`, `height` and `changes` in `media.json`. **Check the alt text** against the actual images, since it was written from the DESIGN.md descriptions.
- [ ] **#29 Data validation**: `scripts/validate-data.ts` + tests.
- [ ] **#30 Acceptance tests**: install Playwright, write `tests/acceptance/`, add a CI job.

## Enzo

- [ ] **#19 Opportunities listing**: `src/pages/OpportunitiesPage.tsx` with `<ModelListing kind="opportunities" cards={getOpportunityCards()} />`.
- [ ] **#22 Opportunity detail pages**: `src/pages/OpportunityDetailPage.tsx`. Past activities must show "Past activity — not accepting signups through this listing." and no signup button. Add a test for that; it wasn't covered in #24.
- [ ] **#31, #32 Statistics Lambda**: `server/stats/` with the GitLab client, aggregation, cache and `server/config/contributors.example.json`.
- [ ] **#33 CI test reporting**: `scripts/report-unit-tests.ts` and the ownership artifact in the `unit` job. The job name `unit` and `reports/junit.xml` are already in place.
- [ ] **#34 About page**: `src/pages/AboutPage.tsx` with team cards from `team.json`, `StatsPanel` + `statsClient`, sources, tools, and the repo and Postman links (`siteConfig` in `src/config/site.ts`).
- [ ] **#35 Stats tests**.

## Everyone

- [ ] Log estimated and actual time on every issue you work on.
- [ ] File real bugs or improvements as issues as you find them. The rubric needs 5 bug/optimization issues.
- [ ] Close your issues when the work is merged (`Closes #N` in the commit message does it automatically).
