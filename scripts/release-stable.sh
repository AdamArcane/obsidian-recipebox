#!/bin/bash
set -e

# Reads the current version from package.json, strips the pre-release suffix,
# bumps the version on dev first, then merges to main and tags the stable release.
# Run this from the dev branch when ready to publish a stable release.
#
# Example:
#   dev is at 0.1.7-beta.3
#   running this script:
#     1. bumps dev to 0.1.7
#     2. merges dev → main
#     3. tags 0.1.7 on main
#     4. returns to dev (already in sync, no extra commit on main)

# Must be on dev branch
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [[ "$current_branch" != "dev" ]]; then
  echo "Error: must be on dev branch (currently on $current_branch)"
  exit 1
fi

# Ensure working tree is clean
if [[ -n $(git status --porcelain) ]]; then
  echo "Error: working tree has uncommitted changes. Commit or stash them first."
  exit 1
fi

# Guard against releasing on top of a broken dev. PRs into dev are already
# gated by CI, but this catches drift from anything committed straight to
# dev (hotfixes, manual pushes) since the last PR merge.
echo "→ Running tests before release..."
if ! npm run test; then
  echo "Error: tests are failing on dev. Fix them before releasing."
  exit 1
fi

# Read current version and strip pre-release suffix
current_version=$(node -e "process.stdout.write(require('./package.json').version)")
stable_version=$(echo "$current_version" | sed 's/-.*$//')

if [[ "$current_version" == "$stable_version" ]]; then
  echo "Error: current version $current_version has no pre-release suffix to strip."
  echo "Use 'npm run release:beta' to start a beta cycle first."
  exit 1
fi

echo "Current dev version:       $current_version"
echo "Stable version to release: $stable_version"
echo ""
read -p "Proceed? (y/N) " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "→ Bumping version to $stable_version on dev..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json'));
pkg.version = '$stable_version';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
const manifest = JSON.parse(fs.readFileSync('manifest.json'));
manifest.version = '$stable_version';
fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, '\t'));
"

# Update changelog
npm run changelog

git add package.json manifest.json CHANGELOG.md
git commit -m "chore: release $stable_version"

echo "→ Pushing dev..."
git push

echo "→ Switching to main..."
git checkout main

echo "→ Merging dev into main..."
git merge dev --no-edit

echo "→ Tagging $stable_version..."
git tag "$stable_version"

echo "→ Pushing main and tag..."
git push
git push --tags

echo "→ Returning to dev..."
git checkout dev

echo ""
echo "Done. Stable $stable_version published."
echo "Dev and main are at the same commit -- no sync needed."
echo "GitHub Actions will now build and publish the stable release."
echo ""
echo "Next: run 'npm run release:beta' to start the next beta cycle."
