# RétroMax release workflow

- Work on a dedicated `agent/*` branch; never implement directly on `main`.
- Treat each completed, tested user-facing iteration as a new release.
- Increment the zero-padded release number in `VERSION`, `APP_VERSION`, the README, and the service-worker cache: `0.0.01`, `0.0.02`, and so on.
- Run syntax, data-format, diff, and relevant browser checks before publishing.
- After successful checks, push the branch, update or open its pull request, merge it into `main`, and create the matching `v0.0.XX` Git tag.
- Do not merge when required checks fail or when the requested work is incomplete.
- Never commit collection exports or other private user data.
