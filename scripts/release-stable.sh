#!/bin/bash
set -e

# Reads the current version from package.json, strips the pre-release suffix,
# bumps the version on dev first, then merges and pushes to main (tagged) or
# release-candidate (untagged, for a final Obsidian-review pass before main).
# Run this from the dev branch when ready to publish a stable release.
#
# Usage:
#   npm run release:stable          # merge to main, tag, publish
#   npm run release:stable -- --rc  # merge to release-candidate only, no tag
#
# Example (no --rc):
#   dev is at 0.1.7-beta.3
#   running this script:
#     1. bumps dev to 0.1.7
#     2. merges dev → main
#     3. tags 0.1.7 on main
#     4. returns to dev (already in sync, no extra commit on main)

rc_branch="release-candidate";
main_branch="main";

# Must not be on main branch
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [[ "$current_branch" == "$main_branch" ]]; then
  echo "Error: must not be on '$main_branch' branch to release a stable or RC version."
  exit 1
fi

# Ensure working tree is clean
if [[ -n $(git status --porcelain) ]]; then
  echo "Error: working tree has uncommitted changes. Commit or stash them first."
  exit 1
fi

# Check for test flag
rc=false
if [[ "$1" == "--rc" ]]; then
  rc=true
fi

# Guard against releasing on top of a broken dev. PRs into dev are already
# gated by CI, but this catches drift from anything committed straight to
# dev (hotfixes, manual pushes) since the last PR merge.
echo "→ Running tests before release..."
if ! npm run test; then
  echo "Error: tests are failing on current branch. Fix them before releasing."
  exit 1
fi

# Read current version and strip pre-release suffix
current_version=$(node -e "process.stdout.write(require('./package.json').version)")
stable_version=$(echo "$current_version" | sed 's/-.*$//')

if [[ "$current_version" == "$stable_version" ]]; then
  if ( $rc ); then
    echo "Error: current version $current_version has no pre-release suffix to strip."
    echo "Use 'npm run release:beta' to start a beta cycle first."
    exit 1
  fi
  # No suffix left, and not an --rc run: this is the second half of an
  # RC->main promotion (the --rc run already stripped it on dev). Nothing
  # left to bump -- skip straight to merge/tag/publish below.
  already_bumped=true
else
  already_bumped=false
fi

echo "Current candidate version: $current_version"
echo "Stable version to release: $stable_version"
echo ""
read -p "Proceed? (y/N) " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
if ( $already_bumped ); then
  echo "→ $current_branch is already at $stable_version -- skipping bump, proceeding to merge/tag/publish."
else
  echo "→ Bumping version to $stable_version on $current_branch..."
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

  echo "→ Pushing $current_branch..."
  git push
fi

if ( $rc ); then
  echo "→ Release candidate flag set; Merging to release-candidate branch instead of main."
  echo "→ Switching to release-candidate branch..."
  git checkout $rc_branch
else
  echo "→ Switching to $main_branch..."
  git checkout $main_branch
fi


echo "→ Merging current branch..."
git merge $current_branch --no-edit

if ( $rc ); then
  echo "→ Skipping tag -- release candidates are never tagged, only true stable releases on $main_branch are."
else
  echo "→ Tagging $stable_version..."
  git tag "$stable_version"
fi

if ( $rc ); then
  echo "→ Pushing $current_branch..."
else
  echo "→ Pushing $current_branch and tag..."
fi
git push
if ( ! $rc ); then
  git push --tags
fi

echo "→ Returning to $current_branch..."
git checkout $current_branch

echo ""
if ( $rc ); then
  echo "Done. $stable_version pushed to $rc_branch for review -- untagged."
  echo "$current_branch and $rc_branch are at the same commit -- no sync needed."
  echo "Once review passes, re-run without --rc to merge, tag, and publish to $main_branch."
else
  echo "Done. Stable $stable_version published."
  echo "$current_branch and $main_branch are at the same commit -- no sync needed."
  echo "GitHub Actions will now build and publish the stable release."
fi
echo ""
echo "Next: run 'npm run release:beta' to start the next beta cycle."
