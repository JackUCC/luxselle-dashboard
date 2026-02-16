#!/usr/bin/env bash
# Merge open PRs 3–9 on JackUCC/luxselle-dashboard (non-draft).
# Requires: gh CLI installed and authenticated (gh auth login).
set -e
cd "$(dirname "$0")/.."
for n in 3 4 5 6 7 8 9; do
  echo "Merging PR #$n..."
  gh pr merge "$n" --merge --repo JackUCC/luxselle-dashboard || true
done
echo "Done."
