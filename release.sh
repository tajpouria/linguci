#! /bin/bash
tag=$(cat package.json | jq -r '.version')
if git tag -l $tag; then
  echo "Tag $tag already exists"
  exit 1
fi

git add action.yml dist/index.js node_modules/*
git commit -m "Update action"
git tag -a -m "Release $tag" $tag
git push --follow-tags
