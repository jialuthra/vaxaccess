# postman

Design of the **future** VaxAccess domain API (DESIGN.md §4.10). Phase I deploys neither this API nor a mock server; the saved examples are the Phase I demonstration.

| File | Contents |
| --- | --- |
| `VaxAccess.postman_collection.json` | `VaxAccess Phase I API`: six GET requests, collection variables `baseUrl`, `siteId`, `vaccineId`, `opportunityId`, saved examples and test scripts |
| `VaxAccess.postman_environment.json` | Public, secret-free variable template |

## Requests

| Request | Saved examples |
| --- | --- |
| `GET /api/v1/sites`, `/vaccines`, `/opportunities` | All three records, one filter, reverse name order, reverse sort on a card field, `pageSize=1`, page beyond the results, zero matches, and 400 errors (unknown sort, unknown filter, invalid page size, duplicate parameter). Sites also has a 500 example. |
| `GET /api/v1/sites/{id}`, `/vaccines/{id}`, `/opportunities/{id}` | Each of the three records, plus a 404 for an unknown ID |

The example bodies were generated from the fixtures in `src/data/` using the same display strings, filtering and sorting as `src/services/catalog.ts` and `listing.ts`. If the fixtures change, regenerate or update the examples so they stay consistent.

The test scripts check status codes, envelopes, counts, required fields, relationships and included sources/media. They are written for a future server: **they have not been run against a live endpoint and must not be reported as passing.**

## Publishing

1. In Postman, **Import** both files.
2. Open the collection → **⋯** → **Publish Docs**, keep the environment set to *No environment* (it contains no secrets anyway), and publish.
3. Copy the public documentation URL and set it as `VITE_POSTMAN_URL` in the Amplify environment variables (and give it to Enzo for the About page).
