#!/bin/bash
# ci_post_clone.sh — Runs automatically in Xcode Cloud after cloning the repo.
# Sets Swift Active Compilation Conditions based on the branch being built.
#
# Xcode Cloud provides CI_BRANCH (e.g., "develop", "main").
# - develop branch → adds DEV_API flag → app uses dev backend URL
# - main branch    → no flag            → app uses prod backend URL

set -e

echo "🔧 ci_post_clone: Branch is '${CI_BRANCH}'"

if [ "$CI_BRANCH" = "develop" ]; then
    echo "🔧 ci_post_clone: Setting DEV_API flag for development build"

    PROJECT_PATH="${CI_PRIMARY_REPOSITORY_PATH}/packages/ios/SavePal/SavePal.xcodeproj/project.pbxproj"

    # Insert SWIFT_ACTIVE_COMPILATION_CONDITIONS = "DEV_API" into Release build configs.
    # This is added after SWIFT_COMPILATION_MODE which only exists in Release configs.
    sed -i '' 's/SWIFT_COMPILATION_MODE = wholemodule;/SWIFT_COMPILATION_MODE = wholemodule;\n\t\t\t\tSWIFT_ACTIVE_COMPILATION_CONDITIONS = "DEV_API";/' "$PROJECT_PATH"

    echo "✅ ci_post_clone: DEV_API flag added to Release build settings"
else
    echo "✅ ci_post_clone: Production build — no additional flags needed"
fi
