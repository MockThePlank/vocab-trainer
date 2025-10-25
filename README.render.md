# Deploying to Render

This project is designed to run on Render's Web Service platform. The repository contains `render.yaml` which configures the service. Below are the recommended settings and checks to ensure a successful deploy, including the lesson upload feature.

## Key Render configuration (already in `render.yaml`)
- Build command: `NPM_CONFIG_PRODUCTION=false npm ci && npm run build`
  - Ensures devDependencies (TypeScript, Vite) are installed for the build step.
- Start command: `node dist/server.js`
- Health check path: `/health`
- Disk mount: a persistent disk mounted at `/data` (configured in `render.yaml` as `vocab-data`)

## Required environment variables
- `ADMIN_API_KEY` (set in Render dashboard, mark as secret)
- `DB_PATH` (recommended: `/data/vocab.db`)
- `AUTO_BACKUP_DIR` (recommended: `/data/backups`)
- `TMPDIR` (recommended: `/tmp`)

## Why these matter
- `multer` must be available at runtime for file uploads. It is declared in `dependencies` so `npm ci` will install it during the build step.
- The build step requires devDependencies (TypeScript and Vite) to compile the source into `dist/`. The build command above forces a full install so `tsc` is available.
- The application writes the SQLite DB and backups to disk; these paths must be writable on the host. The `render.yaml` mounts a named disk at `/data` and we recommend using `/data/vocab.db` for `DB_PATH` so data persists.

## Quick local checks before deploy
```bash
# simulate production-only install (runtime deps)
rm -rf node_modules
NODE_ENV=production npm ci --omit=dev

# install dev deps for build
npm ci
npm run build

# run server
node dist/server.js

# test create-lesson (JSON, no upload)
curl -X POST -H "Content-Type: application/json" -d '{}' http://localhost:3000/api/lessons -v

# test upload (multipart)
# create sample.json with a JSON array of {"de":"...","en":"..."}
curl -F "file=@sample.json" http://localhost:3000/api/lessons -v
```

## Troubleshooting tips
- If lesson creation returns HTTP 500, check Render logs for:
  - `multer import or upload middleware failed for lesson creation` — indicates multer not found or import failed.
  - `Database directory not writable` — indicates the DB_PATH does not point to a writable directory.
- Ensure `package-lock.json` is committed so Render installs exact package versions.

If you want, I can add a small startup health-check that validates `multer` is available and the `DB_PATH` directory is writable and fail the app startup early with clear logs. This helps detect misconfiguration immediately during deploy time.
