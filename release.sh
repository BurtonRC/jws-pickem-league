#!/bin/bash

# Prompt for commit message
echo "Enter commit message: "
read msg

# Commit source changes (only if there are any)
git add . && git commit -m "$msg" || { echo "No source changes"; exit 0; }

# Build the project
npm run build

# Commit build output (if changed)
git add dist && git commit -m "Build: $msg" || echo "No build changes"

# Deploy + push
npm run deploy
git push origin main
