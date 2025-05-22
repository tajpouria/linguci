#! /bin/bash

# Function to increment version
increment_version() {
  current=$1
  IFS='.' read -ra VERSION <<< "$current"
  VERSION[2]=$((VERSION[2] + 1))
  echo "${VERSION[0]}.${VERSION[1]}.${VERSION[2]}"
}

# Get current version from package.json
current_version=$(cat package.json | jq -r '.version')

# Use provided version or increment current version
if [ -z "$1" ]; then
  new_version=$(increment_version "$current_version")
else
  new_version=$1
fi

# Check if new tag already exists
if git tag -l "$new_version" > /dev/null; then
  echo "Error: Tag $new_version already exists"
  echo "Please specify a different version as an argument or let the script auto-increment"
  exit 1
fi

# Update version in package.json
tmp=$(mktemp)
jq ".version = \"$new_version\"" package.json > "$tmp" && mv "$tmp" package.json

# Commit and tag
git add action.yml dist/index.js node_modules/* package.json
git commit -m "Release version $new_version"
git tag -a -m "Release $new_version" "$new_version"
git push --follow-tags

echo "Successfully released version $new_version"
