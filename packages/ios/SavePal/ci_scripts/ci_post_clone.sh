#!/bin/bash
# ci_post_clone.sh — Runs automatically in Xcode Cloud after cloning the repo.
# Swaps the API base URL based on the branch being built.
#
# Xcode Cloud provides CI_BRANCH (e.g., "develop", "main").
# - develop branch → dev backend URL
# - main branch    → prod backend URL (already the default in source)

set -e

echo "🔧 ci_post_clone: Branch is '${CI_BRANCH}'"

if [ "$CI_BRANCH" = "develop" ]; then
    echo "🔧 ci_post_clone: Switching API URL to dev backend"

    ENDPOINTS_FILE="${CI_PRIMARY_REPOSITORY_PATH}/packages/ios/SavePal/SavePal/Core/Networking/APIEndpoints.swift"

    # Verify the file exists
    if [ ! -f "$ENDPOINTS_FILE" ]; then
        echo "❌ ci_post_clone: ERROR - File not found: $ENDPOINTS_FILE"
        echo "   CI_PRIMARY_REPOSITORY_PATH = ${CI_PRIMARY_REPOSITORY_PATH}"
        ls -la "${CI_PRIMARY_REPOSITORY_PATH}/packages/ios/SavePal/SavePal/Core/Networking/" || true
        exit 1
    fi

    echo "📄 ci_post_clone: BEFORE replacement:"
    grep -n "savepal" "$ENDPOINTS_FILE" | head -3

    # Replace the prod URL with the dev URL directly in the source file
    sed -i '' 's|https://savepal.onrender.com/api|https://savepal-backend-dev.onrender.com/api|g' "$ENDPOINTS_FILE"

    echo "📄 ci_post_clone: AFTER replacement:"
    grep -n "savepal" "$ENDPOINTS_FILE" | head -3

    # Verify the replacement actually happened
    if grep -q "savepal-backend-dev.onrender.com" "$ENDPOINTS_FILE"; then
        echo "✅ ci_post_clone: API URL set to https://savepal-backend-dev.onrender.com/api"
    else
        echo "❌ ci_post_clone: ERROR - URL replacement FAILED. File still contains:"
        grep "onrender" "$ENDPOINTS_FILE"
        exit 1
    fi
else
    echo "✅ ci_post_clone: Production build — using default prod API URL"
fi
