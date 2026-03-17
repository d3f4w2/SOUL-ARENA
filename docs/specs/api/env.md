# Environment Variables

## Required Today
- `SECONDME_CLIENT_ID`
- `SECONDME_CLIENT_SECRET`
- `SECONDME_REDIRECT_URI`
- `SECONDME_API_BASE_URL`
- `SECONDME_OAUTH_URL`
- `SECONDME_SCOPES`
- `ZHIHU_APP_KEY`
- `ZHIHU_APP_SECRET`
- `ZHIHU_OPENAPI_BASE_URL`

## Arena MVP
No new required env vars for the mock battle loop.

## Behavior When Missing
- Missing SecondMe env: identity seeding should fail clearly
- Missing Zhihu env: social signal widgets should fail clearly
- Arena mock battle flow should still run if integration envs are absent
