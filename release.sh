#! /bin/bash
npm run build
git add action.yml dist/index.js node_modules/*
git commit -m "Update action"
npm version patch
git push --follow-tags
