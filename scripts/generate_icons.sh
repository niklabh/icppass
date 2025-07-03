#!/bin/bash

# This script generates icons for the browser extension in different sizes
# Requires ImageMagick to be installed (convert command)

SOURCE_ICON="src/icppass_frontend/public/logo2.svg"
OUTPUT_DIR="src/icppass_extension/icons"

# Create output directory if it doesn't exist
mkdir -p $OUTPUT_DIR

# Generate icons in different sizes
convert -background none -resize 16x16 $SOURCE_ICON "$OUTPUT_DIR/icon16.png"
convert -background none -resize 48x48 $SOURCE_ICON "$OUTPUT_DIR/icon48.png"
convert -background none -resize 128x128 $SOURCE_ICON "$OUTPUT_DIR/icon128.png"

# Generate grayscale versions for inactive state
convert "$OUTPUT_DIR/icon16.png" -colorspace gray "$OUTPUT_DIR/icon16_gray.png"
convert "$OUTPUT_DIR/icon48.png" -colorspace gray "$OUTPUT_DIR/icon48_gray.png"
convert "$OUTPUT_DIR/icon128.png" -colorspace gray "$OUTPUT_DIR/icon128_gray.png"

# Generate active state icons with a subtle glow
convert "$OUTPUT_DIR/icon16.png" \
    \( +clone -background "#29abe2" -shadow 80x3+0+0 \) \
    -background none -layers merge +repage "$OUTPUT_DIR/icon16_active.png"

convert "$OUTPUT_DIR/icon48.png" \
    \( +clone -background "#29abe2" -shadow 80x3+0+0 \) \
    -background none -layers merge +repage "$OUTPUT_DIR/icon48_active.png"

echo "Icons generated successfully in $OUTPUT_DIR" 