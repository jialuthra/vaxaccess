# Deployment

Runbook and record for AWS Amplify, vaxaccess.me and the statistics Lambda (DESIGN.md §4.14). Fill in the **Record** tables with actual values as each step is done. Never write a token or real contributor alias here.

## Record

| Item | Value |
| --- | --- |
| AWS account owner / who manages costs and access | _TBD_ |
| Region | _TBD (e.g. us-east-1)_ |
| Credits remaining when provisioned / budget alert | _TBD_ |
| Amplify app ID and default domain | _TBD_ |
| Production branch | `main` |
| Custom domain status (apex HTTPS, www → apex) | _TBD_ |
| Lambda function name, runtime, version/alias | _TBD_, `nodejs24.x` (matches `.nvmrc`), _TBD_ |
| Lambda function URL (`VITE_STATS_URL`) | _TBD_ |
| GitLab token type, owning member, expiry (after grading) | _TBD_ |
| Published Postman docs (`VITE_POSTMAN_URL`) | _TBD_ |
| Deployed frontend Git SHA | _TBD_ |
| Selected unit-test pipeline at submission | _TBD_ |

## 1. Amplify Hosting (#38)

1. Check remaining AWS course credits. In **Billing → Budgets**, create a small monthly budget with an email alert (alerts do not cap spending).
2. **Amplify → Create new app → GitLab**, authorize, choose `nifemisoyemi/cs373-fall-2026-18`, branch `main`. Amplify detects `amplify.yml` (installs with `npm ci` using the `.nvmrc` Node version and serves `dist/`).
3. **Hosting → Environment variables**: add `VITE_STATS_URL` and `VITE_POSTMAN_URL` once they exist (§3 and `postman/README.md`). Until then the site shows "Not configured"/"unavailable", which is fine for development but not for release.
4. **Hosting → Rewrites and redirects → Manage → Add rewrite** so deep links load with HTTP 200:

   | Source address | Target address | Type |
   | --- | --- | --- |
   | `</^[^.]+$\|\.(?!(css\|gif\|ico\|jpg\|jpeg\|js\|json\|map\|mp4\|png\|svg\|txt\|webp\|woff\|woff2)$)([^.]+$)/>` | `/index.html` | `200 (Rewrite)` |

   (Type the source without the backslashes; they only escape the table.)
5. Deploy, then open each of the nine detail URLs directly on the Amplify domain and refresh: each must load with its heading, not redirect.

## 2. vaxaccess.me with HTTPS (#39)

1. Confirm the team controls `vaxaccess.me` (registrar login). Do not assume ownership from the name.
2. **Amplify → Hosting → Custom domains → Add domain** → `vaxaccess.me`. Keep the Amplify-managed certificate.
3. Configure the apex (`vaxaccess.me`) for `main`, and add `www` as a redirect to the apex.
4. If DNS is in Route 53 in the same account, Amplify adds the records. Otherwise add the CNAME/ANAME (or ALIAS) records Amplify shows at your registrar, including the certificate-verification CNAME.
5. Wait for **Available**, then check `https://vaxaccess.me`, `https://www.vaxaccess.me` (redirects to the apex) and `http://vaxaccess.me` (redirects to HTTPS).

## 3. Statistics Lambda (#40)

Enzo's code in `server/stats/` (#31, #32) must be merged first. `npm run build-stats` produces the deployable bundle, `server/dist/stats-lambda.zip` (one self-contained `index.mjs`, no `node_modules` needed). The CI `build` job also publishes it as an artifact, so you can download it from the pipeline for the exact commit you deploy.

1. **GitLab token**: prefer a project access token with only `read_api` (Settings → Access tokens) if the tier offers it; otherwise a personal access token limited to `read_api`, expiring after grading. Record the type, owner and expiry above.
2. **Lambda → Create function**: Node.js runtime matching `.nvmrc` (`nodejs24.x`), same region as above. Upload `server/dist/stats-lambda.zip` (**Code → Upload from → .zip file**); under **Runtime settings** set the handler to `index.handler`.
3. **Configuration → General**: timeout of about 15 s; memory 256 MB. **Concurrency**: set reserved concurrency to a small number (e.g. 5) to bound usage.
4. **Configuration → Environment variables** (server-only): `GITLAB_TOKEN`, `GITLAB_PROJECT_PATH=nifemisoyemi/cs373-fall-2026-18`, `CONTRIBUTOR_MAP` (JSON in the shape of `server/config/contributors.example.json`).
5. **Configuration → Function URL → Create**: auth type `NONE`. Under **CORS**, allow method `GET` and origins `https://vaxaccess.me`, the Amplify `main` branch domain and `http://localhost:5173`. The handler emits no CORS headers of its own; configure CORS only here. Make sure the resource policy grants the public URL invocation permissions AWS currently requires for `NONE` auth (the console adds them when it creates the URL).
6. Test: `curl -i <function-url>` returns 200 JSON with exactly one `Access-Control-Allow-Origin` header when sent with `-H 'Origin: https://vaxaccess.me'`; a `POST` is rejected. Check CloudWatch logs contain no token.
7. Put the function URL in Amplify's `VITE_STATS_URL` and redeploy. Confirm the About page shows live statistics.

## Freeze

After submission, turn off **auto-build** for `main` in Amplify and do not update the Lambda until grading. Live GitLab statistics keep refreshing; later phases must keep the CI contract in DESIGN.md §4.9.
