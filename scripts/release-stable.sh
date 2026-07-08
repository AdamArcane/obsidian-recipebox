#!/bin/bash
set -e

# Read current version from package.json and strip any pre-release suffix
# e.g. 0.1.4-beta.2 → 0.1.4
STABLE=$(node -e "process.stdout.write(require('./package.json').version.replace(/-.*$/, ''))")

echo "Releasing stable $STABLE from main branch..."

git checkout main

# Update package.json and manifest.json to the clean stable version
npm version "$STABLE" --no-git-tag-version
git add package.json manifest.json
git commit -m "chore: release $STABLE"
git tag "$STABLE"
git push
git push --tags

# Return to dev
git checkout dev
echo "Done. Stable $STABLE published. Back on dev."