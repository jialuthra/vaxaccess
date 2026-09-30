# src/config

Public, non-secret configuration.

- `site.ts`: site name, domain, repository URL, Austin Public Health current-resources URL, and the optional `VITE_STATS_URL` / `VITE_POSTMAN_URL` build variables. A missing URL is `null` and should render as "Not configured", never as a fake link.

Never put the GitLab token or contributor map here; they belong only in the Lambda environment.

## Still to do

- Set `VITE_STATS_URL` and `VITE_POSTMAN_URL` in Amplify once the Lambda and Postman docs exist (Nifemi, #38)
