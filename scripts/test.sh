#!/usr/bin/env bash
#
# Amantrika test runner.
#
#   ./scripts/test.sh              unit + end-to-end, then print where the report is
#   ./scripts/test.sh unit         unit tests only (fast, no browser, no database)
#   ./scripts/test.sh e2e          end-to-end only
#   ./scripts/test.sh ui           open Playwright's interactive runner
#   ./scripts/test.sh report       open the last HTML report
#   ./scripts/test.sh live URL     run end-to-end against a deployed origin
#
# End-to-end tests create `e2e-` prefixed users and invitations in whichever
# Supabase project .env.local points at, and delete them in teardown.

set -euo pipefail

cd "$(dirname "$0")/.."

BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GREEN=$'\033[32m'; RESET=$'\033[0m'

step() { printf "\n%s==> %s%s\n" "$BOLD" "$1" "$RESET"; }
note() { printf "%s%s%s\n" "$DIM" "$1" "$RESET"; }

ensure_browsers() {
  # Playwright ships no browser binaries; the first run has to fetch them.
  if ! npx playwright install --dry-run chromium >/dev/null 2>&1; then
    step "Installing the Chromium build Playwright needs (first run only)"
    npx playwright install chromium
  fi
}

run_unit() {
  step "Unit tests — pricing and webhook verification"
  npx vitest run
}

run_e2e() {
  ensure_browsers
  step "End-to-end tests — a production build, driven in a real browser"
  note "Building first; this takes a minute."
  npx playwright test "$@"
}

summary() {
  printf "\n%s%s✔ all tests passed%s\n" "$BOLD" "$GREEN" "$RESET"
  if [ -d playwright-report ]; then
    note "HTML report: playwright-report/index.html"
    note "Open it with: npm run test:report"
  fi
}

failed() {
  printf "\n%s%s✘ tests failed%s\n" "$BOLD" "$RED" "$RESET"
  if [ -d playwright-report ]; then
    note "Traces, screenshots and video of each failure: npm run test:report"
  fi
  exit 1
}

trap failed ERR

case "${1:-all}" in
  unit)
    run_unit
    ;;
  e2e)
    shift || true
    run_e2e "$@"
    ;;
  ui)
    ensure_browsers
    npx playwright test --ui
    exit 0
    ;;
  report)
    npx playwright show-report
    exit 0
    ;;
  live)
    if [ -z "${2:-}" ]; then
      echo "Usage: ./scripts/test.sh live https://amantrika.imswarnil.com" >&2
      exit 2
    fi
    ensure_browsers
    step "End-to-end tests against $2"
    note "No local server is started; the deployed origin is tested as-is."
    E2E_BASE_URL="$2" npx playwright test
    ;;
  all)
    run_unit
    run_e2e
    ;;
  *)
    echo "Unknown command: $1" >&2
    sed -n '3,12p' "$0" >&2
    exit 2
    ;;
esac

trap - ERR
summary
