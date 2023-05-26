#!/usr/bin/env bash
# git filter-branch: map GIT_COMMIT -> unix time via commit-order + rewrite-unix
set -u
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="${REWRITE_DATA_DIR:-$SCRIPT_DIR}"
ORDER="$DATA_DIR/commit-order.txt"
UNIXF="$DATA_DIR/rewrite-unix.txt"
LINE="$(grep -nF "${GIT_COMMIT}" "$ORDER" 2>/dev/null | head -1 | cut -d: -f1 || true)"
if [ -z "${LINE}" ]; then
  exit 0
fi
# strip CRLF if present
TS="$(tr -d '\r' < "$UNIXF" | sed -n "${LINE}p")"
export GIT_AUTHOR_DATE="@${TS} +0000"
export GIT_COMMITTER_DATE="@${TS} +0000"
