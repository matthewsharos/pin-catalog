#!/bin/bash

# Find all files in api directory that contain "new PrismaClient"
FILES=$(grep -l "new PrismaClient" --include="*.js" /Users/degenpoet/pin_catalog/app/api/)

for file in $FILES; do
  echo "Fixing $file"
  
  # Get the relative path to lib/prisma.js based on the file's location
  rel_path=$(python -c "import os; print('../'.repeat(len(os.path.relpath('$file', '/Users/degenpoet/pin_catalog/app/api').split('/')) - 1) + '../lib/prisma')")
  
  # Replace the import and variable declaration with the import from lib/prisma
  sed -i '' -e "s/import { PrismaClient } from '@prisma\/client';/import prisma from '$rel_path';/" "$file"
  
  # Remove the line that creates a new PrismaClient instance
  sed -i '' -e "/const prisma = new PrismaClient();/d" "$file"
  
  # Ensure there aren't double blank lines where we removed code
  sed -i '' -e "/^$/{N;/^\n$/d;}" "$file"
done

echo "All Prisma clients have been updated to use the centralized client."
