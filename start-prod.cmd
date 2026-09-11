@echo off
REM ============================================================
REM  ANVATION 2026 - Production start script (Windows)
REM  Starts the hardened, multi-core server on port 3001
REM  from the pre-built dist/ folder. Access via the configured production URL.
REM ============================================================
cd /d "%~dp0"
if not exist "dist\server.cjs" (
  echo dist is missing. Building first...
  call npm.cmd run build
)
echo Building assets (frontend + server bundling)...
call npm.cmd run build
echo.
echo Starting server (all cores) on http://0.0.0.0:3001 ...
echo Press Ctrl+C to stop.
set NODE_ENV=production
set PORT=3001
set CLUSTER_WORKERS=auto
node dist/server.cjs
