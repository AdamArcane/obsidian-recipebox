#!/bin/bash
set -e

# Reads the current version from package.json, strips the pre-release suffix,
# merges dev into main, tags the stable version, pushes, then returns to dev.
# Run this from the dev branch when ready to publish a stable release.
#
# Example:
#   dev is at 0.1.5-beta.3
#   running this script produces stable tag 0.1.5 on main

# Must be on dev branch
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [[ "$current_branch" != "dev" ]]; then
  echo "Error: must be on dev branch (currently on $current_branch)"
  exit 1
fi

# Read current version and strip pre-release suffix
current_version=$(node -e "process.stdout.write(require('./package.json').version)")
stable_version=$(echo "$current_version" | sed 's/-.*$//')

if [[ "$current_version" == "$stable_version" ]]; then
  echo "Error: current version $current_version has no pre-release suffix to strip."
  echo "Are you already on a stable version? Use 'npm version prerelease --preid=beta' on dev instead."
  exit 1
fi

echo "Current dev version:      $current_version"
echo "Stable version to release: $stable_version"
echo ""
read -p "Proceed? (y/N) " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "→ Verifying dev builds cleanly before touching main..."
npm run build

echo ""
echo "→ Switching to main..."
git checkout main

echo "→ Merging dev into main..."
git merge dev --no-edit

echo "→ Setting stable version $stable_version..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json'));
pkg.version = '$stable_version';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
const manifest = JSON.parse(fs.readFileSync('manifest.json'));
manifest.version = '$stable_version';
fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, '\t'));
"

# Build release notes after bumping package version so changelog headings use the new tag version.
npm run changelog

git add package.json manifest.json CHANGELOG.md
git commit -m "chore: release $stable_version"

echo "→ Tagging $stable_version..."
git tag "$stable_version"

echo ""
echo "Ready to publish. Review the merge, then run:"
echo "  git push && git push --tags"
echo "to trigger the GitHub Actions release build."


echo ""
echo "Done. Stable $stable_version published. Back on dev."
echo "GitHub Actions will now build and publish the stable release."
