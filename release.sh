#! /bin/bash
tag=$(cat package.json | jq -r '.version')
npm run build
git add action.yml dist/index.js node_modules/*
git commit -m "Update action"
git tag -a -m "Release $tag" $tag
git push --follow-tags
