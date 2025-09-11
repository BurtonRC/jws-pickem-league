#!/bin/bash

# Prompt for commit message
read -p "Enter commit message (Enter to reuse last, q to cancel): " msg

# Cancel if 'q'
if [[ "$msg" == "q" ]]; then
  echo "Release aborted by user."
  exit 0
fi

# If empty, reuse last commit message
if [[ -z "$msg" ]]; then
  msg=$(git log -1 --pretty=%B)
  echo "Reusing last commit message: '$msg'"
fi

# Determine next version
# Get all previous commits with the same message pattern
existing=$(git log --pretty=%B | grep -E "^$msg( v[0-9]+)?$")

if [[ -z "$existing" ]]; then
  versioned_msg="$msg v1"
else
  # Extract the highest existing version number
  last_version=$(echo "$existing" | grep -o -E "v[0-9]+" | grep -o -E "[0-9]+" | sort -nr | head -1)
  if [[ -z "$last_version" ]]; then
    last_version=1
  fi
  next_version=$((last_version + 1))
  versioned_msg="$msg v$next_version"
fi

echo "Using commit message: '$versioned_msg'"

# Commit source changes (only if any)
git add .
if git commit -m "$versioned_msg" 2>/dev/null; then
  # Build project
  npm run build

  # Add build output and amend into the same commit
  git add dist
  git commit --amend --no-edit

  # Deploy + push
  npm run deploy
  git push origin main
else
  echo "No source changes, skipping build/deploy/push."
fi
