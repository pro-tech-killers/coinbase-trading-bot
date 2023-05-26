#!/usr/bin/env bash
set -euo pipefail
# Usage: run-rewrite-dates.sh <absolute-path-to-data-dir>
if [ -z "${1:-}" ]; then
  echo "Usage: $0 <data_dir_with_order_and_unix_files>" >&2
  exit 1
fi
export REWRITE_DATA_DIR="$(cd "$1" && pwd)"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT" || exit 1
EF="${REPO_ROOT}/scripts/env-filter-dates.sh"
echo "REWRITE_DATA_DIR=$REWRITE_DATA_DIR"
echo "Repository: $REPO_ROOT"
export FILTER_BRANCH_SQUELCH_WARNING=1
git filter-branch -f --env-filter "bash \"$EF\"" -- master
echo "Sample log:"
git log -3 --format='%h | %ad | %s' --date=iso-strict
