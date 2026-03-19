# SavePals

## Project Structure
Monorepo with packages: `backend`, `android`, `ios`, `frontend`

## Branch Strategy
- `main` — production deployments
- `develop` — development deployments

## Android Versioning
- **Dev builds** (`develop` branch): Use `-dev` suffix, e.g. `1.0.8-dev`. The `dev` product flavor in `build.gradle.kts` automatically appends `-dev` via `versionNameSuffix`.
- **Production builds** (`main` branch): Clean version without suffix, e.g. `1.0.8`
- When bumping Android version on `develop`, only increment `versionName`/`versionCode` in `defaultConfig` — the `-dev` suffix is handled by the product flavor.
- Build commands: `./gradlew bundleDevRelease` (dev AAB), `./gradlew bundleProdRelease` (prod AAB)

## Backend
- Uses Prisma ORM with Supabase PostgreSQL
- Dev and prod use separate Supabase instances
- `.env` controls which database is active (dev URLs uncommented by default)

## Deployment
- Render: `savepal-backend` (main/prod) + `savepal-backend-dev` (develop/dev) — see `render.yaml`
- Android: `dev` and `prod` product flavors with separate API URLs
- iOS: `#if DEBUG` conditional for dev vs prod API URL
