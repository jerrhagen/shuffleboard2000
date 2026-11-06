#!/bin/sh
# Bygger och lägger dist/ på grenen gh-pages. Ingen CI: sidan är ute inom någon minut.
set -e
cd "$(dirname "$0")/.."
npm test
npm run build
touch dist/.nojekyll
export GIT_INDEX_FILE="$(pwd)/.git/deploy-index"
rm -f "$GIT_INDEX_FILE"
GIT_DIR="$(pwd)/.git" GIT_WORK_TREE="$(pwd)/dist" git add -A
tree=$(git write-tree)
commit=$(git commit-tree "$tree" -m "Publicera $(git rev-parse --short HEAD)")
rm -f "$GIT_INDEX_FILE"
unset GIT_INDEX_FILE
git push -f origin "$commit:refs/heads/gh-pages"
