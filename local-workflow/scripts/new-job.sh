#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JOBS_DIR="$ROOT/jobs"

usage() {
  cat <<'EOF'
Usage:
  ./scripts/new-job.sh <slug>              # create jobs/<slug>.md and open in $EDITOR
  ./scripts/new-job.sh <slug> --stdin      # read JD from stdin into the file
  ./scripts/new-job.sh <slug> --clip       # read JD from clipboard (requires xclip or pbpaste)

Examples:
  ./scripts/new-job.sh stripe-pm
  pbpaste | ./scripts/new-job.sh meta-swe --stdin
EOF
}

slug="${1:-}"
mode="${2:-}"

if [[ -z "$slug" || "$slug" == "-h" || "$slug" == "--help" ]]; then
  usage
  exit 0
fi

slug="${slug%.md}"
target="$JOBS_DIR/$slug.md"

if [[ -f "$target" ]]; then
  echo "Job file already exists: $target" >&2
  exit 1
fi

mkdir -p "$JOBS_DIR"

case "$mode" in
  --stdin)
    cat > "$target"
    ;;
  --clip)
    if command -v pbpaste >/dev/null 2>&1; then
      pbpaste > "$target"
    elif command -v xclip >/dev/null 2>&1; then
      xclip -o -selection clipboard > "$target"
    else
      echo "No clipboard tool found (pbpaste or xclip)." >&2
      exit 1
    fi
    ;;
  "")
    cat > "$target" <<EOF
# Company — Role Title

**Company:** 
**Title:** 
**Job ID:** 

## Job description

Paste the full posting here.

EOF
  if [[ -n "${EDITOR:-}" ]]; then
    "$EDITOR" "$target"
  else
    echo "Created $target — edit it, then run tailor-resume."
  fi
  exit 0
    ;;
  *)
    echo "Unknown option: $mode" >&2
    usage
    exit 1
    ;;
esac

echo "Created $target"
