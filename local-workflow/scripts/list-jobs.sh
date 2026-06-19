#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Jobs in $ROOT/jobs/:"
shopt -s nullglob
found=0
for job in "$ROOT/jobs"/*.md; do
  found=1
  base="$(basename "$job" .md)"
  out="$ROOT/output/$base.tex"
  if [[ -f "$out" ]]; then
    echo "  [done]  $base  ->  output/$base.tex"
  else
    echo "  [todo]  $base"
  fi
done

if [[ "$found" -eq 0 ]]; then
  echo "  (no job files yet — run ./scripts/new-job.sh <slug>)"
fi
