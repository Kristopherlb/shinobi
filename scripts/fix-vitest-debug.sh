#!/bin/bash
# Fix vitest configs to add debug: false to nxViteTsPaths

find packages -name "vitest.config.ts" -type f | while read -r file; do
  # Only update if nxViteTsPaths() exists without debug: false
  if grep -q "nxViteTsPaths()" "$file" && ! grep -q "nxViteTsPaths({ debug: false })" "$file"; then
    echo "Updating $file"
    sed -i '' 's/nxViteTsPaths()/nxViteTsPaths({ debug: false })/g' "$file"
  fi
done

# Also check apps directory
find apps -name "vitest.config.ts" -type f | while read -r file; do
  if grep -q "nxViteTsPaths()" "$file" && ! grep -q "nxViteTsPaths({ debug: false })" "$file"; then
    echo "Updating $file"
    sed -i '' 's/nxViteTsPaths()/nxViteTsPaths({ debug: false })/g' "$file"
  fi
done

echo "Done updating vitest configs"

