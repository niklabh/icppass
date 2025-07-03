#!/bin/bash

# This script builds the mobile wrapper for ICPPass

# Set variables
MOBILE_SRC="src/icppass_mobile"
MOBILE_DIST="dist/mobile"
SOURCE_ICON="src/icppass_frontend/public/logo2.svg"
ICONS_DIR="$MOBILE_DIST/icons/ios"

# Create output directory
mkdir -p $MOBILE_DIST
mkdir -p $ICONS_DIR

# Copy HTML and CSS files
cp $MOBILE_SRC/index.html $MOBILE_DIST/
cp $MOBILE_SRC/styles.css $MOBILE_DIST/

# Update canister IDs in the HTML file
FRONTEND_CANISTER_ID=$(dfx canister id icppass_frontend)
sed -i '' "s/FRONTEND_CANISTER_ID/$FRONTEND_CANISTER_ID/g" $MOBILE_DIST/index.html

# Generate icons for iOS
echo "Generating iOS icons..."

if command -v convert &> /dev/null; then
  # Using ImageMagick to generate icons
  convert -background none -resize 120x120 $SOURCE_ICON "$ICONS_DIR/icon-120.png"
  convert -background none -resize 152x152 $SOURCE_ICON "$ICONS_DIR/icon-152.png"
  convert -background none -resize 167x167 $SOURCE_ICON "$ICONS_DIR/icon-167.png"
  convert -background none -resize 180x180 $SOURCE_ICON "$ICONS_DIR/icon-180.png"
  
  # Generate splash screens (simplified, would need proper design for production)
  convert -background "#29abe2" -gravity center \
    -size 1125x2436 $SOURCE_ICON -resize 375x375 -composite "$ICONS_DIR/splash-1125x2436.png"
  convert -background "#29abe2" -gravity center \
    -size 828x1792 $SOURCE_ICON -resize 300x300 -composite "$ICONS_DIR/splash-828x1792.png"
  convert -background "#29abe2" -gravity center \
    -size 1242x2688 $SOURCE_ICON -resize 375x375 -composite "$ICONS_DIR/splash-1242x2688.png"
  
  echo "Icons generated successfully."
else
  echo "ImageMagick not found. Using placeholder icons."
  # Create placeholder files
  mkdir -p $ICONS_DIR
  touch "$ICONS_DIR/icon-120.png"
  touch "$ICONS_DIR/icon-152.png"
  touch "$ICONS_DIR/icon-167.png"
  touch "$ICONS_DIR/icon-180.png"
  touch "$ICONS_DIR/splash-1125x2436.png"
  touch "$ICONS_DIR/splash-828x1792.png"
  touch "$ICONS_DIR/splash-1242x2688.png"
fi

echo "Mobile build complete. Files available in $MOBILE_DIST" 